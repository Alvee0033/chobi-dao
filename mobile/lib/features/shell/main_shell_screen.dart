import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_theme.dart';
import '../../core/widgets/hero_components.dart';
import '../../models/event.dart';
import '../../providers/event_provider.dart';
import '../analytics/analytics_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../events/create_event_dialog.dart';
import '../events/event_detail_screen.dart';
import '../events/event_list_screen.dart';
import '../photos/photo_upload_screen.dart';
import '../scanner/qr_scanner_screen.dart';
import '../settings/settings_screen.dart';

/// Main navigation shell for Chobi Dao.
/// Manages the [HeroFloatingDock] bottom bar and maintains the state of
/// Dashboard, Events, Analytics, and Settings via an [IndexedStack].
class MainShellScreen extends StatefulWidget {
  final int initialIndex;

  const MainShellScreen({
    super.key,
    this.initialIndex = 0,
  });

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, 3);
  }

  void _onTabSelected(int index) {
    if (_currentIndex != index) {
      setState(() {
        _currentIndex = index;
      });
    }
  }

  Future<void> _handleNewEventAction() async {
    final navigator = Navigator.of(context);
    final newEvent = await CreateEventDialog.show(context);
    if (newEvent != null && mounted) {
      navigator.push(
        MaterialPageRoute(
          builder: (_) => EventDetailScreen(event: newEvent),
        ),
      );
    }
  }

  Future<void> _handleUploadPhotosAction() async {
    final eventProvider = context.read<EventProvider>();
    final events = eventProvider.events;

    if (events.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please create an event before uploading photos.'),
          backgroundColor: AppColors.brandOrange,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          action: SnackBarAction(
            label: 'Create',
            textColor: Colors.white,
            onPressed: _handleNewEventAction,
          ),
        ),
      );
      _handleNewEventAction();
      return;
    }

    if (events.length == 1) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PhotoUploadScreen(event: events.first),
        ),
      );
      return;
    }

    // Multiple events available: present a quick picker sheet
    _showEventPickerSheet(events);
  }

  void _showEventPickerSheet(List<Event> events) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4.5,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Select Target Event',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: AppColors.charcoal,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Choose which event you would like to upload photos to',
              style: TextStyle(
                fontSize: 12.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.sizeOf(ctx).height * 0.45,
              ),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: events.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (eventCtx, index) {
                  final event = events[index];
                  return Material(
                    color: AppColors.creamCanvas,
                    borderRadius: BorderRadius.circular(14),
                    child: InkWell(
                      onTap: () {
                        Navigator.pop(ctx);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PhotoUploadScreen(event: event),
                          ),
                        );
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: AppColors.brandOrangeSubtle,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.photo_library_rounded,
                                color: AppColors.brandOrange,
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    event.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      color: AppColors.charcoal,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${event.totalPhotos} photos • ${event.status.toUpperCase()}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.chevron_right_rounded,
                              size: 18,
                              color: AppColors.textTertiary,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleScanQrAction() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const QrScannerScreen(),
      ),
    );
  }

  void _showQuickActionsSheet(BuildContext context) {
    HapticFeedback.lightImpact();

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetContext) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF2D1807).withValues(alpha: 0.12),
              blurRadius: 32,
              offset: const Offset(0, -8),
            ),
          ],
        ),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 4.5,
                decoration: BoxDecoration(
                  color: AppColors.border.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Quick Actions',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.charcoal,
                          letterSpacing: -0.4,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Create, upload, or scan instantly',
                        style: TextStyle(
                          fontSize: 12.5,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Material(
                  color: AppColors.creamCanvas,
                  borderRadius: BorderRadius.circular(20),
                  child: InkWell(
                    onTap: () => Navigator.pop(sheetContext),
                    borderRadius: BorderRadius.circular(20),
                    child: const Padding(
                      padding: EdgeInsets.all(6),
                      child: Icon(
                        Icons.close_rounded,
                        size: 18,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Divider(height: 1),
            const SizedBox(height: 14),

            // Action 1: New Event
            _buildQuickActionTile(
              sheetContext: sheetContext,
              icon: Icons.add_circle_outline_rounded,
              iconColor: AppColors.brandOrange,
              iconBgColor: AppColors.brandOrangeSubtle,
              title: 'New Event',
              subtitle: 'Create and publish a new event photo portal',
              onTap: () {
                Navigator.pop(sheetContext);
                _handleNewEventAction();
              },
            ),
            const SizedBox(height: 10),

            // Action 2: Upload Photos
            _buildQuickActionTile(
              sheetContext: sheetContext,
              icon: Icons.cloud_upload_outlined,
              iconColor: const Color(0xFFC44508),
              iconBgColor: const Color(0xFFFDE8DC),
              title: 'Upload Photos',
              subtitle: 'Batch upload camera roll photos to an event',
              onTap: () {
                Navigator.pop(sheetContext);
                _handleUploadPhotosAction();
              },
            ),
            const SizedBox(height: 10),

            // Action 3: Scan QR
            _buildQuickActionTile(
              sheetContext: sheetContext,
              icon: Icons.qr_code_scanner_rounded,
              iconColor: const Color(0xFF7C3AED),
              iconBgColor: const Color(0xFFF3E8FF),
              title: 'Scan QR',
              subtitle: 'Scan attendee portal QR code to view live feed',
              onTap: () {
                Navigator.pop(sheetContext);
                _handleScanQrAction();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActionTile({
    required BuildContext sheetContext,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: AppColors.creamCanvas,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: BorderRadius.circular(18),
        splashColor: iconColor.withValues(alpha: 0.1),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: AppColors.border.withValues(alpha: 0.6),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: iconColor.withValues(alpha: 0.25),
                    width: 1,
                  ),
                ),
                child: Icon(icon, color: iconColor, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w700,
                        color: AppColors.charcoal,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: AppColors.textTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.creamCanvas,
      body: IndexedStack(
        index: _currentIndex,
        children: [
          DashboardScreen(
            onNavigateToTab: _onTabSelected,
          ),
          const EventListScreen(),
          const AnalyticsScreen(),
          const SettingsScreen(),
        ],
      ),
      bottomNavigationBar: HeroFloatingDock(
        currentIndex: _currentIndex,
        onTabSelected: _onTabSelected,
        onCenterAction: () => _showQuickActionsSheet(context),
        leftItems: const [
          HeroFloatingDockItem(
            icon: Icons.grid_view_outlined,
            activeIcon: Icons.grid_view_rounded,
            label: 'Dashboard',
          ),
          HeroFloatingDockItem(
            icon: Icons.event_seat_outlined,
            activeIcon: Icons.event_seat_rounded,
            label: 'Events',
          ),
        ],
        rightItems: const [
          HeroFloatingDockItem(
            icon: Icons.bar_chart_outlined,
            activeIcon: Icons.bar_chart_rounded,
            label: 'Analytics',
          ),
          HeroFloatingDockItem(
            icon: Icons.tune_outlined,
            activeIcon: Icons.tune_rounded,
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
