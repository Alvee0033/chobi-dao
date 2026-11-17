import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/app_theme.dart';
import '../../models/event.dart';
import '../../providers/event_provider.dart';

class EventDetailScreen extends StatefulWidget {
  final Event event;

  const EventDetailScreen({super.key, required this.event});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  late Event _currentEvent;
  final ImagePicker _picker = ImagePicker();
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _currentEvent = widget.event;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EventProvider>().fetchIndexStatus(_currentEvent.id);
    });
  }

  String get _guestUrl =>
      'https://api-chobi.203.96.190.78.sslip.io/e/${_currentEvent.slug}';

  void _copyGuestUrl() {
    Clipboard.setData(ClipboardData(text: _guestUrl));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text('Guest link copied to clipboard!'),
          ],
        ),
        backgroundColor: AppColors.charcoal,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Future<void> _pickAndUploadPhotos() async {
    try {
      final List<XFile> images = await _picker.pickMultiImage(
        imageQuality: 85,
      );

      if (images.isEmpty) return;

      setState(() => _isUploading = true);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Selected ${images.length} photos for processing.'),
          backgroundColor: AppColors.brandOrange,
          behavior: SnackBarBehavior.floating,
        ),
      );

      // Simulate upload completion & trigger index status refresh
      await Future.delayed(const Duration(seconds: 2));
      if (!mounted) return;

      await context.read<EventProvider>().fetchIndexStatus(_currentEvent.id);

      setState(() {
        _isUploading = false;
        _currentEvent = _currentEvent.copyWith(
          totalPhotos: _currentEvent.totalPhotos + images.length,
        );
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Photos uploaded! Face indexing in progress.'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      setState(() => _isUploading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Upload failed: $e'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _confirmDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Event?'),
        content: Text(
          'Are you sure you want to delete "${_currentEvent.name}"? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final provider = context.read<EventProvider>();
      final ok = await provider.deleteEvent(_currentEvent.id);
      if (ok && mounted) {
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final eventProvider = context.watch<EventProvider>();
    final indexStatus = eventProvider.indexStatus;

    final formattedDate = _currentEvent.date != null
        ? DateFormat('MMMM d, yyyy').format(_currentEvent.date!)
        : 'Date not set';

    return Scaffold(
      backgroundColor: AppColors.creamCanvas,
      appBar: AppBar(
        title: Text(
          _currentEvent.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_rounded),
            tooltip: 'Copy Guest Link',
            onPressed: _copyGuestUrl,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
            tooltip: 'Delete Event',
            onPressed: _confirmDelete,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => eventProvider.fetchIndexStatus(_currentEvent.id),
        color: AppColors.brandOrange,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Event Hero / QR Code Card
              Container(
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: AppShadows.card,
                ),
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                child: Column(
                  children: [
                    // Badge: Scan to find photos
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.brandOrangeSubtle,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.qr_code_scanner_rounded,
                            size: 16,
                            color: AppColors.brandOrange,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Guest Self-Service QR',
                            style: TextStyle(
                              color: AppColors.brandOrange,
                              fontWeight: FontWeight.w700,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // QR Code Display
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.borderLight, width: 1.5),
                        boxShadow: const [
                          BoxShadow(
                            color: Color(0x082D1807),
                            blurRadius: 12,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                      child: QrImageView(
                        data: _guestUrl,
                        version: QrVersions.auto,
                        size: 200.0,
                        eyeStyle: const QrEyeStyle(
                          eyeShape: QrEyeShape.square,
                          color: AppColors.brandOrange,
                        ),
                        dataModuleStyle: const QrDataModuleStyle(
                          dataModuleShape: QrDataModuleShape.circle,
                          color: AppColors.charcoal,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Event Slug / Link Bar
                    InkWell(
                      onTap: _copyGuestUrl,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.creamCanvas,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.link_rounded,
                              size: 18,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _guestUrl,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.charcoal,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const Icon(
                              Icons.copy_rounded,
                              size: 16,
                              color: AppColors.brandOrange,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Real-Time Indexing Progress Card
              Container(
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: AppShadows.card,
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: indexStatus.isIndexing
                                    ? AppColors.warning
                                    : AppColors.success,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Face Indexing Engine',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ],
                        ),
                        IconButton(
                          icon: eventProvider.isIndexingLoading
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(
                                  Icons.refresh_rounded,
                                  size: 20,
                                  color: AppColors.brandOrange,
                                ),
                          onPressed: () => eventProvider.fetchIndexStatus(_currentEvent.id),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Progress Bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: indexStatus.totalPhotos > 0
                            ? indexStatus.progressRatio
                            : (_currentEvent.totalPhotos > 0 ? 1.0 : 0.0),
                        minHeight: 10,
                        backgroundColor: AppColors.borderLight,
                        valueColor: const AlwaysStoppedAnimation<Color>(
                          AppColors.brandOrange,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Progress Counters Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatPill(
                          label: 'Total',
                          value: '${indexStatus.totalPhotos > 0 ? indexStatus.totalPhotos : _currentEvent.totalPhotos}',
                          color: AppColors.charcoal,
                        ),
                        _buildStatPill(
                          label: 'Indexed',
                          value: '${indexStatus.indexedPhotos > 0 ? indexStatus.indexedPhotos : _currentEvent.indexedPhotos}',
                          color: AppColors.success,
                        ),
                        _buildStatPill(
                          label: 'In Queue',
                          value: '${indexStatus.matchedPhotos}',
                          color: AppColors.warning,
                        ),
                        _buildStatPill(
                          label: 'Failed',
                          value: '${indexStatus.failedPhotos}',
                          color: AppColors.error,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Event Information Card
              Container(
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: AppShadows.card,
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Event Information',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 16),
                    _buildInfoRow(
                      icon: Icons.calendar_today_rounded,
                      title: 'Date',
                      value: formattedDate,
                    ),
                    if (_currentEvent.location != null &&
                        _currentEvent.location!.isNotEmpty) ...[
                      const Divider(height: 24),
                      _buildInfoRow(
                        icon: Icons.location_on_rounded,
                        title: 'Location',
                        value: _currentEvent.location!,
                      ),
                    ],
                    if (_currentEvent.pin != null &&
                        _currentEvent.pin!.isNotEmpty) ...[
                      const Divider(height: 24),
                      _buildInfoRow(
                        icon: Icons.lock_outline_rounded,
                        title: 'Access PIN',
                        value: _currentEvent.pin!,
                      ),
                    ],
                    if (_currentEvent.details != null &&
                        _currentEvent.details!.isNotEmpty) ...[
                      const Divider(height: 24),
                      _buildInfoRow(
                        icon: Icons.notes_rounded,
                        title: 'Notes',
                        value: _currentEvent.details!,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Upload Action Button
              SizedBox(
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: _isUploading ? null : _pickAndUploadPhotos,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandOrange,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  icon: _isUploading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.cloud_upload_rounded),
                  label: Text(
                    _isUploading
                        ? 'Uploading & Indexing...'
                        : 'Upload Event Photos',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatPill({
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AppColors.brandOrange),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.charcoal,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
