import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:intl/intl.dart";
import "package:provider/provider.dart";
import "package:qr_flutter/qr_flutter.dart";
import "package:share_plus/share_plus.dart";
import "../../core/theme/app_theme.dart";
import "../../models/event.dart";
import "../../providers/event_provider.dart";
import "../photos/photo_upload_screen.dart";

class EventDetailScreen extends StatefulWidget {
  final Event event;

  const EventDetailScreen({super.key, required this.event});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  late Event _currentEvent;

  @override
  void initState() {
    super.initState();
    _currentEvent = widget.event;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EventProvider>().fetchIndexStatus(_currentEvent.id);
    });
  }

  String get _guestUrl =>
      "https://api-chobi.203.96.190.78.sslip.io/e/${_currentEvent.slug}";

  void _copyGuestUrl() {
    Clipboard.setData(ClipboardData(text: _guestUrl));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
            SizedBox(width: 8),
            Text("Guest link copied to clipboard!"),
          ],
        ),
        backgroundColor: AppColors.charcoal,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _shareGuestUrl() {
    SharePlus.instance.share(ShareParams(text: "Find your photos from ${_currentEvent.name}: $_guestUrl"));
  }

  Future<void> _pickAndUploadPhotos() async {
    final provider = context.read<EventProvider>();
    final uploaded = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoUploadScreen(event: _currentEvent),
      ),
    );

    if (uploaded == true && mounted) {
      await provider.fetchIndexStatus(_currentEvent.id);
      await provider.fetchEvents();
    }
  }

  Future<void> _confirmDelete() async {
    final navigator = Navigator.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Delete Event?"),
        content: Text(
          "Are you sure you want to delete ${_currentEvent.name}? This action cannot be undone.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text("Delete"),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (!mounted) return;
      final provider = context.read<EventProvider>();
      final ok = await provider.deleteEvent(_currentEvent.id);
      if (ok) {
        navigator.pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final eventProvider = context.watch<EventProvider>();
    final indexStatus = eventProvider.indexStatus;

    final formattedDate = _currentEvent.date != null
        ? DateFormat("MMMM d, yyyy").format(_currentEvent.date!)
        : "Date not set";

    return Scaffold(
      backgroundColor: AppColors.creamCanvas,
      appBar: AppBar(
        title: Text(
          _currentEvent.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_rounded),
            tooltip: "Share Guest Link",
            onPressed: _shareGuestUrl,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: AppColors.error),
            tooltip: "Delete Event",
            onPressed: _confirmDelete,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // QR Code Standee Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: AppShadows.card,
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            "Guest QR Standee",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.charcoal,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Guests scan to instantly find photos",
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.brandOrangeSubtle,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          "Active",
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.brandOrange,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: QrImageView(
                        data: _guestUrl,
                        version: QrVersions.auto,
                        size: 200.0,
                        eyeStyle: const QrEyeStyle(
                          eyeShape: QrEyeShape.square,
                          color: AppColors.charcoal,
                        ),
                        dataModuleStyle: const QrDataModuleStyle(
                          dataModuleShape: QrDataModuleShape.square,
                          color: AppColors.charcoal,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),
                  Text(
                    _guestUrl,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 16),

                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _copyGuestUrl,
                          icon: const Icon(Icons.copy_rounded, size: 16),
                          label: const Text("Copy Link"),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _shareGuestUrl,
                          icon: const Icon(Icons.share_rounded, size: 16),
                          label: const Text("Share QR"),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // AI Indexing Status Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: AppShadows.card,
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "AI Face Indexing Status",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.charcoal,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.refresh_rounded, size: 20),
                        tooltip: "Refresh indexing",
                        onPressed: () => context
                            .read<EventProvider>()
                            .fetchIndexStatus(_currentEvent.id),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: indexStatus.progressRatio,
                      minHeight: 8,
                      backgroundColor: AppColors.borderLight,
                      valueColor: const AlwaysStoppedAnimation<Color>(
                        AppColors.brandOrange,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStatPill("Total", "${indexStatus.totalPhotos}"),
                      _buildStatPill("Indexed", "${indexStatus.indexedPhotos}"),
                      _buildStatPill("Matched", "${indexStatus.matchedPhotos}"),
                      _buildStatPill("Status", indexStatus.status.toUpperCase()),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Event Details / Meta
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: AppShadows.card,
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                children: [
                  _buildInfoRow(
                    icon: Icons.calendar_today_rounded,
                    label: "Event Date",
                    value: formattedDate,
                  ),
                  if (_currentEvent.location != null) ...[
                    const Divider(height: 24),
                    _buildInfoRow(
                      icon: Icons.place_outlined,
                      label: "Venue / City",
                      value: _currentEvent.location!,
                    ),
                  ],
                  const Divider(height: 24),
                  _buildInfoRow(
                    icon: Icons.photo_camera_back_rounded,
                    label: "Uploaded Photos",
                    value: "${_currentEvent.totalPhotos} photos",
                  ),
                  if (_currentEvent.pin != null && _currentEvent.pin!.isNotEmpty) ...[
                    const Divider(height: 24),
                    _buildInfoRow(
                      icon: Icons.lock_outline_rounded,
                      label: "Access PIN",
                      value: _currentEvent.pin!,
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Upload Button
            SizedBox(
              height: 54,
              child: ElevatedButton.icon(
                onPressed: _pickAndUploadPhotos,
                icon: const Icon(Icons.cloud_upload_rounded),
                label: const Text(
                  "Upload & Index Photos",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildStatPill(String title, String val) {
    return Column(
      children: [
        Text(
          val,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: AppColors.charcoal,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          title,
          style: const TextStyle(
            fontSize: 11,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.textSecondary),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.textSecondary,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: AppColors.charcoal,
          ),
        ),
      ],
    );
  }
}
