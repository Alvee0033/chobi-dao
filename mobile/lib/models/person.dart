class EventPerson {
  final String personId;
  final String label;
  final int faceCount;
  final int photoCount;
  final String coverPhotoId;
  final String coverThumbUrl;
  final DateTime? updatedAt;

  EventPerson({
    required this.personId,
    required this.label,
    required this.faceCount,
    required this.photoCount,
    required this.coverPhotoId,
    required this.coverThumbUrl,
    this.updatedAt,
  });

  factory EventPerson.fromJson(Map<String, dynamic> json) {
    return EventPerson(
      personId: json["personId"] ?? "",
      label: json["label"] ?? "Person",
      faceCount: json["faceCount"] ?? 0,
      photoCount: json["photoCount"] ?? 0,
      coverPhotoId: json["coverPhotoId"] ?? "",
      coverThumbUrl: json["coverThumbUrl"] ?? "",
      updatedAt: json["updatedAt"] != null ? DateTime.tryParse(json["updatedAt"]) : null,
    );
  }
}
