class EventPhoto {
  final String id;
  final String eventId;
  final String url;
  final String? originalFilename;
  final int? sizeBytes;
  final int faceCount;
  final String status;
  final DateTime? createdAt;

  EventPhoto({
    required this.id,
    required this.eventId,
    required this.url,
    this.originalFilename,
    this.sizeBytes,
    this.faceCount = 0,
    this.status = "indexed",
    this.createdAt,
  });

  factory EventPhoto.fromJson(Map<String, dynamic> json) {
    return EventPhoto(
      id: json["id"] ?? "",
      eventId: json["eventId"] ?? "",
      url: json["url"] ?? json["optimizedUrl"] ?? json["thumbnailUrl"] ?? "",
      originalFilename: json["originalFilename"] ?? json["filename"],
      sizeBytes: json["sizeBytes"] as int?,
      faceCount: json["faceCount"] ?? 0,
      status: json["status"] ?? "indexed",
      createdAt: json["createdAt"] != null ? DateTime.tryParse(json["createdAt"]) : null,
    );
  }
}
