class Event {
  final String id;
  final String name;
  final String slug;
  final DateTime? date;
  final String? location;
  final String? details;
  final int totalPhotos;
  final int indexedPhotos;
  final String? pin;
  final String status;
  final String? coverPhotoUrl;
  final DateTime? createdAt;

  const Event({
    required this.id,
    required this.name,
    required this.slug,
    this.date,
    this.location,
    this.details,
    this.totalPhotos = 0,
    this.indexedPhotos = 0,
    this.pin,
    this.status = 'active',
    this.coverPhotoUrl,
    this.createdAt,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic value) {
      if (value == null) return null;
      if (value is DateTime) return value;
      return DateTime.tryParse(value.toString());
    }

    return Event(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Untitled Event',
      slug: json['slug'] as String? ?? '',
      date: parseDate(json['date'] ?? json['eventDate']),
      location: json['location'] as String?,
      details: json['details'] as String?,
      totalPhotos: (json['totalPhotos'] ?? json['total_photos'] ?? 0) as int,
      indexedPhotos:
          (json['indexedPhotos'] ?? json['indexed_photos'] ?? 0) as int,
      pin: json['pin'] as String? ?? json['password'] as String? ?? json['passwordHash'] as String?,
      status: json['status'] as String? ?? 'active',
      coverPhotoUrl: json['coverPhotoUrl'] as String? ?? json['thumbnailUrl'] as String?,
      createdAt: parseDate(json['createdAt'] ?? json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'slug': slug,
      'date': date?.toIso8601String(),
      'location': location,
      'details': details,
      'totalPhotos': totalPhotos,
      'indexedPhotos': indexedPhotos,
      'pin': pin,
      'status': status,
      'coverPhotoUrl': coverPhotoUrl,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  Event copyWith({
    String? id,
    String? name,
    String? slug,
    DateTime? date,
    String? location,
    String? details,
    int? totalPhotos,
    int? indexedPhotos,
    String? pin,
    String? status,
    String? coverPhotoUrl,
    DateTime? createdAt,
  }) {
    return Event(
      id: id ?? this.id,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      date: date ?? this.date,
      location: location ?? this.location,
      details: details ?? this.details,
      totalPhotos: totalPhotos ?? this.totalPhotos,
      indexedPhotos: indexedPhotos ?? this.indexedPhotos,
      pin: pin ?? this.pin,
      status: status ?? this.status,
      coverPhotoUrl: coverPhotoUrl ?? this.coverPhotoUrl,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
