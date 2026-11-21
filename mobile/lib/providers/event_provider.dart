import 'package:flutter/foundation.dart';
import '../core/api/api_client.dart';
import '../models/event.dart';
import '../models/index_status.dart';
import '../models/person.dart';
import '../models/photo.dart';

class DashboardStats {
  final int totalEvents;
  final int photosProcessed;
  final int liveGuestSearches;

  const DashboardStats({
    this.totalEvents = 0,
    this.photosProcessed = 0,
    this.liveGuestSearches = 0,
  });
}

class EventProvider extends ChangeNotifier {
  final ApiClient _apiClient;

  List<Event> _events = [];
  Event? _selectedEvent;
  IndexStatus _indexStatus = const IndexStatus();
  DashboardStats _stats = const DashboardStats();
  List<EventPhoto> _photos = [];
  List<EventPerson> _people = [];

  bool _isLoading = false;
  bool _isCreating = false;
  bool _isIndexingLoading = false;
  bool _isLoadingGallery = false;
  bool _isLoadingPeople = false;
  String? _errorMessage;

  EventProvider({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  List<Event> get events => _events;
  Event? get selectedEvent => _selectedEvent;
  IndexStatus get indexStatus => _indexStatus;
  DashboardStats get stats => _stats;
  List<EventPhoto> get photos => _photos;
  List<EventPerson> get people => _people;

  bool get isLoading => _isLoading;
  bool get isCreating => _isCreating;
  bool get isIndexingLoading => _isIndexingLoading;
  bool get isLoadingGallery => _isLoadingGallery;
  bool get isLoadingPeople => _isLoadingPeople;
  String? get errorMessage => _errorMessage;

  void clearError() {
    if (_errorMessage != null) {
      _errorMessage = null;
      notifyListeners();
    }
  }

  void selectEvent(Event? event) {
    _selectedEvent = event;
    if (event != null) {
      fetchIndexStatus(event.id);
    }
    notifyListeners();
  }

  Future<void> fetchEvents() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.get('/v1/events');
      if (response.data is List) {
        final list = response.data as List;
        _events = list.map((item) => Event.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        _events = [];
      }

      await fetchDashboardStats();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = ApiClient.extractErrorMessage(e);
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchDashboardStats() async {
    try {
      final response = await _apiClient.get('/v1/analytics');
      if (response.data != null && response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;
        final totalPhotos = (data['totalPhotos'] ?? data['photosDelivered'] ?? 0) as int;
        final totalViews = (data['totalViews'] ?? 0) as int;

        _stats = DashboardStats(
          totalEvents: _events.length,
          photosProcessed: totalPhotos > 0
              ? totalPhotos
              : _events.fold<int>(0, (sum, e) => sum + e.totalPhotos),
          liveGuestSearches: totalViews,
        );
      } else {
        _updateStatsFromEvents();
      }
    } catch (_) {
      _updateStatsFromEvents();
    }
  }

  void _updateStatsFromEvents() {
    final processed = _events.fold<int>(0, (sum, e) => sum + e.totalPhotos);
    _stats = DashboardStats(
      totalEvents: _events.length,
      photosProcessed: processed,
      liveGuestSearches: (_events.length * 12),
    );
  }

  Future<Event?> createEvent({
    required String name,
    DateTime? date,
    String? location,
    String? details,
    String? pin,
  }) async {
    _isCreating = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final payload = <String, dynamic>{
        'name': name.trim(),
        if (date != null) 'eventDate': date.toIso8601String(),
        if (location != null && location.isNotEmpty) 'location': location.trim(),
        if (details != null && details.isNotEmpty) 'details': details.trim(),
        if (pin != null && pin.isNotEmpty) 'password': pin.trim(),
      };

      final response = await _apiClient.post('/v1/events', data: payload);
      final newEvent = Event.fromJson(response.data as Map<String, dynamic>);
      _events.insert(0, newEvent);
      _updateStatsFromEvents();

      _isCreating = false;
      notifyListeners();
      return newEvent;
    } catch (e) {
      _errorMessage = ApiClient.extractErrorMessage(e);
      _isCreating = false;
      notifyListeners();
      return null;
    }
  }

  Future<bool> deleteEvent(String eventId) async {
    try {
      final response = await _apiClient.delete('/v1/events/$eventId');
      final status = response.statusCode ?? 200;
      if (status >= 200 && status < 300) {
        _events.removeWhere((e) => e.id == eventId);
        if (_selectedEvent?.id == eventId) {
          _selectedEvent = null;
        }
        _updateStatsFromEvents();
        notifyListeners();
        return true;
      }
      _errorMessage = 'Server error ($status): failed to delete event';
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchIndexStatus(String eventId) async {
    _isIndexingLoading = true;
    notifyListeners();

    try {
      final response = await _apiClient.get('/v1/events/$eventId/index-status');
      if (response.data != null && response.data is Map<String, dynamic>) {
        _indexStatus = IndexStatus.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (_) {
      // Fallback: estimate from event total photos if api error
      if (_selectedEvent != null) {
        _indexStatus = IndexStatus(
          status: _selectedEvent!.totalPhotos > 0 ? 'completed' : 'idle',
          totalPhotos: _selectedEvent!.totalPhotos,
          indexedPhotos: _selectedEvent!.indexedPhotos,
          matchedPhotos: 0,
          failedPhotos: 0,
        );
      }
    } finally {
      _isIndexingLoading = false;
      notifyListeners();
    }
  }

  Future<bool> uploadAndIndexPhotos({
    required String eventId,
    required List<dynamic> files,
    required void Function(int current, int total, String status) onProgress,
  }) async {
    if (files.isEmpty) return true;

    final total = files.length;
    // Pre-allocated slots so parallel writes are index-safe
    final List<String?> photoIdSlots = List<String?>.filled(total, null);
    int completedCount = 0;

    try {
      // Upload in parallel batches of up to 4 concurrent uploads
      const int batchSize = 4;

      for (int batchStart = 0; batchStart < total; batchStart += batchSize) {
        final batchEnd = (batchStart + batchSize).clamp(0, total);
        final batchIndices = List.generate(batchEnd - batchStart, (k) => batchStart + k);

        await Future.wait(
          batchIndices.map((i) async {
            final file = files[i];
            final String fileName = file.name as String? ?? 'photo_$i.jpg';
            final int fileBytesLength = await file.length() as int;
            final List<int> bytes = await file.readAsBytes() as List<int>;

            // 1. Get direct upload URL & photoId
            final uploadUrlRes = await _apiClient.post(
              '/v1/events/$eventId/upload-url',
              data: {
                'fileName': fileName,
                'contentType': 'image/jpeg',
                'fileSizeBytes': fileBytesLength,
              },
            );

            final photoId = (uploadUrlRes.data as Map<String, dynamic>)['photoId'] as String;

            // 2. Stream raw binary bytes via PUT
            await _apiClient.uploadDirectPhoto(
              eventId: eventId,
              photoId: photoId,
              bytes: bytes,
              contentType: 'image/jpeg',
            );

            photoIdSlots[i] = photoId;
            completedCount++;
            onProgress(completedCount, total, 'Uploaded $completedCount/$total photos...');
          }),
        );
      }

      final List<String> uploadedPhotoIds = photoIdSlots.whereType<String>().toList();

      // 3. Finalize upload & trigger BullMQ indexing queue for all photos at once
      onProgress(total, total, 'Dispatching AI face indexing worker...');
      await _apiClient.patch(
        '/v1/events/$eventId/finalize-upload',
        data: {'photoIds': uploadedPhotoIds},
      );

      // Refresh events and index status
      await fetchEvents();
      await fetchIndexStatus(eventId);

      return true;
    } catch (e) {
      _errorMessage = ApiClient.extractErrorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchEventPhotos(String eventId, {String? personId}) async {
    _isLoadingGallery = true;
    notifyListeners();

    try {
      final response = await _apiClient.get(
        '/v1/events/$eventId/photos',
        queryParameters: {
          'includeProcessing': 'true',
          if (personId != null && personId.isNotEmpty) 'personId': personId,
        },
      );

      if (response.data is List) {
        final list = response.data as List;
        _photos = list.map((item) {
          final map = item as Map<String, dynamic>;
          final url = (map['url'] ?? map['fullUrl'] ?? map['thumbUrl'] ?? '') as String;
          return EventPhoto(
            id: (map['id'] ?? '') as String,
            eventId: eventId,
            url: url,
            originalFilename: map['fileName'] as String?,
            sizeBytes: map['sizeBytes'] as int?,
            status: (map['status'] ?? 'ready') as String,
          );
        }).toList();
      } else {
        _photos = [];
      }
    } catch (_) {
      _photos = [];
    } finally {
      _isLoadingGallery = false;
      notifyListeners();
    }
  }

  Future<void> fetchEventPeople(String eventId) async {
    _isLoadingPeople = true;
    notifyListeners();

    try {
      final response = await _apiClient.get('/v1/events/$eventId/people');
      if (response.data is List) {
        final list = response.data as List;
        _people = list.map((item) => EventPerson.fromJson(item as Map<String, dynamic>)).toList();
      } else {
        _people = [];
      }
    } catch (_) {
      _people = [];
    } finally {
      _isLoadingPeople = false;
      notifyListeners();
    }
  }
}
