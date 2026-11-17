class IndexStatus {
  final String status;
  final int totalPhotos;
  final int indexedPhotos;
  final int matchedPhotos;
  final int failedPhotos;

  const IndexStatus({
    this.status = 'idle',
    this.totalPhotos = 0,
    this.indexedPhotos = 0,
    this.matchedPhotos = 0,
    this.failedPhotos = 0,
  });

  bool get isIndexing =>
      status == 'indexing' || (totalPhotos > 0 && indexedPhotos + failedPhotos < totalPhotos);

  bool get isCompleted =>
      totalPhotos > 0 && (indexedPhotos + failedPhotos >= totalPhotos);

  double get progressRatio {
    if (totalPhotos == 0) return 0.0;
    return (indexedPhotos / totalPhotos).clamp(0.0, 1.0);
  }

  factory IndexStatus.fromJson(Map<String, dynamic> json) {
    final total = (json['totalPhotos'] ?? json['total'] ?? 0) as int;
    final indexed = (json['indexedPhotos'] ?? json['indexed'] ?? 0) as int;
    final matched = (json['matchedPhotos'] ?? json['inProgress'] ?? 0) as int;
    final failed = (json['failedPhotos'] ?? json['failed'] ?? 0) as int;

    String st = json['status'] as String? ?? '';
    if (st.isEmpty) {
      if (total == 0) {
        st = 'idle';
      } else if (matched > 0 || (indexed + failed < total)) {
        st = 'indexing';
      } else {
        st = 'completed';
      }
    }

    return IndexStatus(
      status: st,
      totalPhotos: total,
      indexedPhotos: indexed,
      matchedPhotos: matched,
      failedPhotos: failed,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'status': status,
      'totalPhotos': totalPhotos,
      'indexedPhotos': indexedPhotos,
      'matchedPhotos': matchedPhotos,
      'failedPhotos': failedPhotos,
    };
  }
}
