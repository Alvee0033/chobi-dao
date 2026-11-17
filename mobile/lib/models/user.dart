class User {
  final String id;
  final String email;
  final String name;
  final String plan;
  final bool hasDriveConnected;
  final String? driveRootFolderId;
  final String? avatarUrl;

  const User({
    required this.id,
    required this.email,
    required this.name,
    this.plan = 'free',
    this.hasDriveConnected = false,
    this.driveRootFolderId,
    this.avatarUrl,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? 'Photographer',
      plan: json['plan'] as String? ?? 'free',
      hasDriveConnected: json['hasDriveConnected'] as bool? ?? false,
      driveRootFolderId: json['driveRootFolderId'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'plan': plan,
      'hasDriveConnected': hasDriveConnected,
      'driveRootFolderId': driveRootFolderId,
      'avatarUrl': avatarUrl,
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? name,
    String? plan,
    bool? hasDriveConnected,
    String? driveRootFolderId,
    String? avatarUrl,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      plan: plan ?? this.plan,
      hasDriveConnected: hasDriveConnected ?? this.hasDriveConnected,
      driveRootFolderId: driveRootFolderId ?? this.driveRootFolderId,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
}
