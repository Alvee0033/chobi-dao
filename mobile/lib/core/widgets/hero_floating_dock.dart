import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

/// Navigation item model for [HeroFloatingDock].
class HeroDockItem {
  final IconData icon;
  final IconData? activeIcon;
  final String label;
  final Widget? badge;
  final String? tooltip;

  const HeroDockItem({
    required this.icon,
    this.activeIcon,
    required this.label,
    this.badge,
    this.tooltip,
  });
}

/// Backward compatibility alias for [HeroDockItem].
class HeroFloatingDockItem extends HeroDockItem {
  const HeroFloatingDockItem({
    required super.icon,
    super.activeIcon,
    required super.label,
    super.badge,
    super.tooltip,
  });
}

/// A luxury floating dock widget inspired by HeroUI and macOS/iOS docks.
///
/// Features:
/// - Floating pill with subtle border and glassmorphic / white backdrop.
/// - Smooth rounded corners and soft ambient charcoal shadow.
/// - 4-5 dock items with smooth animated active indicator pill & scale transition.
/// - Prominent elevated circular/squircle center action button with brand orange glow.
/// - Triggers [HeroQuickActionSheet] (New Event, Upload Photos, Scan QR).
/// - Haptic feedback on touches ([HapticFeedback.selectionClick]).
/// - Responsive sizing: clamped to max 320dp on narrow screens like Fold 4 outer screen.
class HeroFloatingDock extends StatefulWidget implements PreferredSizeWidget {
  /// Current active tab index (0 to items.length - 1).
  final int currentIndex;

  @override
  Size get preferredSize => Size.fromHeight(height + 16.0);

  /// Callback when a dock tab is selected.
  final ValueChanged<int>? onIndexChanged;

  /// Optional alias callback for [onIndexChanged].
  final ValueChanged<int>? onTabSelected;

  /// Optional override callback for the center prominent action button.
  /// If null, automatically opens [HeroQuickActionSheet].
  final VoidCallback? onActionPressed;

  /// Optional alias callback for [onActionPressed].
  final VoidCallback? onCenterAction;

  /// Callback for "New Event" action inside the quick action sheet.
  final VoidCallback? onNewEvent;

  /// Callback for "Upload Photos" action inside the quick action sheet.
  final VoidCallback? onUploadPhotos;

  /// Callback for "Scan QR" action inside the quick action sheet.
  final VoidCallback? onScanQr;

  /// Dock navigation items. Defaults to standard 4 items (Dashboard, Events, Insights, Settings).
  final List<HeroDockItem>? items;

  /// Optional explicit left items before center button.
  final List<HeroDockItem>? leftItems;

  /// Optional explicit right items after center button.
  final List<HeroDockItem>? rightItems;

  /// Custom center button icon or widget.
  final Widget? centerIcon;

  /// Center button tooltip.
  final String centerTooltip;

  /// Maximum width of the dock. Defaults to 300dp on narrow displays and 320dp on regular displays.
  final double? maxWidth;

  /// Height of the dock. Defaults to 50dp.
  final double height;

  /// Whether to use a glassmorphic blurred backdrop. Defaults to true.
  final bool isGlassmorphic;

  /// Outer margin around the dock. Defaults to bottom 8dp.
  final EdgeInsetsGeometry margin;

  /// Dock border radius. Defaults to 26dp.
  final double borderRadius;

  const HeroFloatingDock({
    super.key,
    required this.currentIndex,
    this.onIndexChanged,
    this.onTabSelected,
    this.onActionPressed,
    this.onCenterAction,
    this.onNewEvent,
    this.onUploadPhotos,
    this.onScanQr,
    this.items,
    this.leftItems,
    this.rightItems,
    this.centerIcon,
    this.centerTooltip = 'Quick Actions',
    this.maxWidth,
    this.height = 50.0,
    this.isGlassmorphic = true,
    this.margin = const EdgeInsets.only(bottom: 8.0, left: 16.0, right: 16.0),
    this.borderRadius = 26.0,
  }) : assert(
          onIndexChanged != null || onTabSelected != null,
          'Either onIndexChanged or onTabSelected must be provided.',
        );

  /// Default items for Chobi Dao App.
  static const List<HeroDockItem> defaultItems = [
    HeroDockItem(
      icon: Icons.grid_view_outlined,
      activeIcon: Icons.grid_view_rounded,
      label: 'Dashboard',
      tooltip: 'Dashboard',
    ),
    HeroDockItem(
      icon: Icons.photo_library_outlined,
      activeIcon: Icons.photo_library_rounded,
      label: 'Events',
      tooltip: 'Events',
    ),
    HeroDockItem(
      icon: Icons.bar_chart_rounded,
      activeIcon: Icons.bar_chart_rounded,
      label: 'Insights',
      tooltip: 'Insights',
    ),
    HeroDockItem(
      icon: Icons.settings_outlined,
      activeIcon: Icons.settings_rounded,
      label: 'Settings',
      tooltip: 'Settings',
    ),
  ];

  /// Static helper to trigger the quick actions sheet from anywhere.
  static Future<T?> showQuickActions<T>(
    BuildContext context, {
    VoidCallback? onNewEvent,
    VoidCallback? onUploadPhotos,
    VoidCallback? onScanQr,
  }) {
    return HeroQuickActionSheet.show<T>(
      context,
      onNewEvent: onNewEvent,
      onUploadPhotos: onUploadPhotos,
      onScanQr: onScanQr,
    );
  }

  @override
  State<HeroFloatingDock> createState() => _HeroFloatingDockState();
}

class _HeroFloatingDockState extends State<HeroFloatingDock> {
  void _handleItemTap(int index) {
    if (widget.currentIndex != index) {
      HapticFeedback.selectionClick();
      if (widget.onIndexChanged != null) {
        widget.onIndexChanged!(index);
      } else if (widget.onTabSelected != null) {
        widget.onTabSelected!(index);
      }
    }
  }

  void _handleCenterAction() {
    HapticFeedback.mediumImpact();
    final actionCallback = widget.onActionPressed ?? widget.onCenterAction;
    if (actionCallback != null) {
      actionCallback();
    } else {
      HeroQuickActionSheet.show(
        context,
        onNewEvent: widget.onNewEvent,
        onUploadPhotos: widget.onUploadPhotos,
        onScanQr: widget.onScanQr,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<HeroDockItem> left;
    final List<HeroDockItem> right;

    if (widget.leftItems != null && widget.rightItems != null) {
      left = widget.leftItems!;
      right = widget.rightItems!;
    } else {
      final effectiveItems = widget.items ?? HeroFloatingDock.defaultItems;
      final int splitIndex = (effectiveItems.length / 2).ceil();
      left = effectiveItems.take(splitIndex).toList();
      right = effectiveItems.skip(splitIndex).toList();
    }

    final screenWidth = MediaQuery.sizeOf(context).width;

    // Responsive sizing: max width 300dp on narrow screens, 320dp on regular displays
    final effectiveMaxWidth = widget.maxWidth ?? (screenWidth < 360 ? 300.0 : 320.0);
    final clampedWidth = (screenWidth - 24.0).clamp(270.0, effectiveMaxWidth);

    Widget dockContent = Container(
      width: clampedWidth,
      height: widget.height,
      padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 3.0),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: widget.isGlassmorphic ? 0.90 : 1.0),
        borderRadius: BorderRadius.circular(widget.borderRadius),
        border: Border.all(
          color: AppColors.border.withValues(alpha: 0.6),
          width: 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F2D1807), // 0xFF2D1807 at 0.12 alpha
            blurRadius: 24,
            offset: Offset(0, 8),
            spreadRadius: 0,
          ),
          BoxShadow(
            color: Color(0x0A2D1807), // subtle ambient contact shadow
            blurRadius: 6,
            offset: Offset(0, 2),
            spreadRadius: 0,
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Left dock tabs
          ...left.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            final isSelected = widget.currentIndex == index;
            return Expanded(
              child: _DockItemButton(
                item: item,
                isSelected: isSelected,
                onTap: () => _handleItemTap(index),
              ),
            );
          }),

          // Center prominent elevated action button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4.0),
            child: _CenterActionButton(
              onTap: _handleCenterAction,
              iconWidget: widget.centerIcon,
              tooltip: widget.centerTooltip,
            ),
          ),

          // Right dock tabs
          ...right.asMap().entries.map((entry) {
            final index = left.length + entry.key;
            final item = entry.value;
            final isSelected = widget.currentIndex == index;
            return Expanded(
              child: _DockItemButton(
                item: item,
                isSelected: isSelected,
                onTap: () => _handleItemTap(index),
              ),
            );
          }),
        ],
      ),
    );

    if (widget.isGlassmorphic) {
      dockContent = ClipRRect(
        borderRadius: BorderRadius.circular(widget.borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: dockContent,
        ),
      );
    }

    return Padding(
      padding: widget.margin,
      child: Center(
        child: dockContent,
      ),
    );
  }
}

/// Dock tab item with smooth active indicator transitions and micro-pill highlight.
class _DockItemButton extends StatelessWidget {
  final HeroDockItem item;
  final bool isSelected;
  final VoidCallback onTap;

  const _DockItemButton({
    required this.item,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final iconData = isSelected ? (item.activeIcon ?? item.icon) : item.icon;

    return Semantics(
      label: item.label,
      selected: isSelected,
      button: true,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          splashColor: AppColors.brandOrange.withValues(alpha: 0.12),
          highlightColor: AppColors.brandOrange.withValues(alpha: 0.06),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 2.0, vertical: 3.0),
            decoration: BoxDecoration(
              color: isSelected
                  ? AppColors.brandOrangeSubtle.withValues(alpha: 0.85)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected
                    ? AppColors.brandOrange.withValues(alpha: 0.20)
                    : Colors.transparent,
                width: 1.0,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon with scale transition and optional badge
                Stack(
                  clipBehavior: Clip.none,
                  alignment: Alignment.center,
                  children: [
                    AnimatedScale(
                      scale: isSelected ? 1.08 : 1.0,
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeOutBack,
                      child: Icon(
                        iconData,
                        size: 18,
                        color: isSelected
                            ? AppColors.brandOrange
                            : AppColors.charcoalMuted,
                      ),
                    ),
                    if (item.badge != null)
                      Positioned(
                        top: -3,
                        right: -5,
                        child: item.badge!,
                      ),
                  ],
                ),
                const SizedBox(height: 1.5),

                // Label
                AnimatedDefaultTextStyle(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeInOut,
                  style: TextStyle(
                    fontSize: 9.0,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? AppColors.brandOrangeDark
                        : AppColors.textSecondary,
                    letterSpacing: -0.2,
                    height: 1.0,
                  ),
                  child: Text(
                    item.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(height: 1),

                // Micro indicator bar
                AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOutCubic,
                  width: isSelected ? 8 : 0,
                  height: 2.0,
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.brandOrange : Colors.transparent,
                    borderRadius: BorderRadius.circular(2),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: AppColors.brandOrange.withValues(alpha: 0.5),
                              blurRadius: 3,
                              offset: const Offset(0, 1),
                            ),
                          ]
                        : null,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Prominent elevated squircle brand orange button with `+` icon and soft orange glow shadow.
class _CenterActionButton extends StatefulWidget {
  final VoidCallback onTap;
  final Widget? iconWidget;
  final String tooltip;

  const _CenterActionButton({
    required this.onTap,
    this.iconWidget,
    this.tooltip = 'Quick Actions',
  });

  @override
  State<_CenterActionButton> createState() => _CenterActionButtonState();
}

class _CenterActionButtonState extends State<_CenterActionButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: widget.tooltip,
      button: true,
      child: Tooltip(
        message: widget.tooltip,
        child: GestureDetector(
          onTapDown: (_) => setState(() => _isPressed = true),
          onTapUp: (_) {
            setState(() => _isPressed = false);
            widget.onTap();
          },
          onTapCancel: () => setState(() => _isPressed = false),
          child: AnimatedScale(
            scale: _isPressed ? 0.90 : 1.0,
            duration: const Duration(milliseconds: 140),
            curve: Curves.easeOutQuad,
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                gradient: AppColors.orangeGradient,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.brandOrange.withValues(alpha: 0.38),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                    spreadRadius: 0,
                  ),
                  const BoxShadow(
                    color: Color(0x1F2D1807), // 0xFF2D1807 at 0.12 alpha
                    blurRadius: 4,
                    offset: Offset(0, 1),
                    spreadRadius: 0,
                  ),
                ],
              ),
              child: Center(
                child: widget.iconWidget ??
                    const Icon(
                      Icons.add_rounded,
                      color: Colors.white,
                      size: 21,
                    ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Luxury HeroUI Quick Action modal bottom sheet.
class HeroQuickActionSheet extends StatelessWidget {
  final VoidCallback? onNewEvent;
  final VoidCallback? onUploadPhotos;
  final VoidCallback? onScanQr;

  const HeroQuickActionSheet({
    super.key,
    this.onNewEvent,
    this.onUploadPhotos,
    this.onScanQr,
  });

  /// Presents the bottom sheet with clean slide-up animation.
  static Future<T?> show<T>(
    BuildContext context, {
    VoidCallback? onNewEvent,
    VoidCallback? onUploadPhotos,
    VoidCallback? onScanQr,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => HeroQuickActionSheet(
        onNewEvent: onNewEvent,
        onUploadPhotos: onUploadPhotos,
        onScanQr: onScanQr,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(
          color: AppColors.border.withValues(alpha: 0.8),
          width: 1,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x262D1807),
            blurRadius: 32,
            offset: Offset(0, -6),
          ),
        ],
      ),
      padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + bottomInset),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle pill
          Center(
            child: Container(
              width: 38,
              height: 4.5,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Header
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
                      'Create event, upload gallery, or scan QR',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Material(
                color: AppColors.creamCanvas,
                borderRadius: BorderRadius.circular(20),
                child: InkWell(
                  onTap: () => Navigator.of(context).pop(),
                  borderRadius: BorderRadius.circular(20),
                  child: const Padding(
                    padding: EdgeInsets.all(6.0),
                    child: Icon(
                      Icons.close_rounded,
                      size: 18,
                      color: AppColors.charcoalMuted,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Action 1: Create New Event
          _ActionTile(
            title: 'New Event',
            subtitle: 'Create & publish a new photography collection',
            icon: Icons.add_circle_outline_rounded,
            iconColor: AppColors.brandOrange,
            iconBgColor: AppColors.brandOrangeSubtle,
            onTap: () {
              Navigator.of(context).pop();
              if (onNewEvent != null) {
                onNewEvent!();
              }
            },
          ),
          const SizedBox(height: 10),

          // Action 2: Upload Photos
          _ActionTile(
            title: 'Upload Photos',
            subtitle: 'Batch upload high-res images with AI indexing',
            icon: Icons.cloud_upload_outlined,
            iconColor: const Color(0xFF0284C7),
            iconBgColor: const Color(0xFFE0F2FE),
            onTap: () {
              Navigator.of(context).pop();
              if (onUploadPhotos != null) {
                onUploadPhotos!();
              }
            },
          ),
          const SizedBox(height: 10),

          // Action 3: Scan QR
          _ActionTile(
            title: 'Scan QR Code',
            subtitle: 'Instant attendee check-in or access gallery',
            icon: Icons.qr_code_scanner_rounded,
            iconColor: AppColors.charcoal,
            iconBgColor: AppColors.creamSurface,
            onTap: () {
              Navigator.of(context).pop();
              if (onScanQr != null) {
                onScanQr!();
              }
            },
          ),
        ],
      ),
    );
  }
}

/// Action item row inside [HeroQuickActionSheet].
class _ActionTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;
  final Color iconBgColor;
  final VoidCallback onTap;

  const _ActionTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
    required this.iconBgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: BorderRadius.circular(16),
        splashColor: iconColor.withValues(alpha: 0.08),
        highlightColor: iconColor.withValues(alpha: 0.04),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: AppColors.border.withValues(alpha: 0.7),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: iconBgColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Icon(
                    icon,
                    color: iconColor,
                    size: 22,
                  ),
                ),
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
                        fontSize: 11.5,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.arrow_forward_ios_rounded,
                size: 13,
                color: AppColors.textTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
