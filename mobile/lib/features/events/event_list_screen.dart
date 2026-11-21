import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/hero_components.dart';
import '../../models/event.dart';
import '../../providers/event_provider.dart';
import 'create_event_dialog.dart';
import 'event_detail_screen.dart';

class EventListScreen extends StatefulWidget {
  const EventListScreen({super.key});

  @override
  State<EventListScreen> createState() => _EventListScreenState();
}

class _EventListScreenState extends State<EventListScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedFilter = 'all'; // 'all', 'active', 'archived'

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.trim().toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showEventActionSheet(Event event) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF2D1807).withValues(alpha: 0.12),
              blurRadius: 30,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4.5,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppColors.brandOrangeSubtle,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.brandOrange.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: const Icon(
                    Icons.event_seat_rounded,
                    color: AppColors.brandOrange,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.name,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '/${event.slug}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                HeroBadge(
                  label: event.status.toUpperCase(),
                  variant: HeroBadgeVariant.dot,
                  color: event.status == 'active' ? HeroBadgeColor.success : HeroBadgeColor.warning,
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Divider(height: 1),
            const SizedBox(height: 10),
            _buildActionListTile(
              icon: Icons.qr_code_rounded,
              iconColor: AppColors.brandOrange,
              title: 'View QR Code & Indexing Status',
              subtitle: 'Check attendee scans and gallery sync',
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => EventDetailScreen(event: event),
                  ),
                );
              },
            ),
            _buildActionListTile(
              icon: Icons.link_rounded,
              iconColor: AppColors.charcoal,
              title: 'Copy Guest Link',
              subtitle: 'Share access portal with attendees',
              onTap: () {
                Navigator.pop(ctx);
                final url = '${ApiClient.defaultWebBaseUrl}/e/${event.slug}';
                Clipboard.setData(ClipboardData(text: url));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: const Row(
                      children: [
                        Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Text('Guest portal link copied to clipboard!'),
                      ],
                    ),
                    backgroundColor: AppColors.charcoal,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                );
              },
            ),
            _buildActionListTile(
              icon: Icons.delete_outline_rounded,
              iconColor: AppColors.error,
              title: 'Delete Event',
              subtitle: 'Permanently remove portal and associations',
              isDestructive: true,
              onTap: () async {
                Navigator.pop(ctx);
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (dCtx) => AlertDialog(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                    title: const Text('Delete Event?'),
                    content: Text('Are you sure you want to delete "${event.name}"? This action cannot be undone.'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(dCtx, false),
                        child: const Text('Cancel'),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
                        onPressed: () => Navigator.pop(dCtx, true),
                        child: const Text('Delete'),
                      ),
                    ],
                  ),
                );
                if (confirm == true && mounted) {
                  final messenger = ScaffoldMessenger.of(context);
                  final eventName = event.name;
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Row(
                        children: [
                          SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          ),
                          SizedBox(width: 12),
                          Text('Deleting event...'),
                        ],
                      ),
                      duration: Duration(seconds: 4),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );

                  final provider = context.read<EventProvider>();
                  final ok = await provider.deleteEvent(event.id);
                  if (!mounted) return;
                  messenger.hideCurrentSnackBar();

                  if (ok) {
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text('"$eventName" deleted successfully.'),
                        backgroundColor: AppColors.charcoal,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  } else {
                    final errorMsg = provider.errorMessage;
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text(errorMsg != null && errorMsg.isNotEmpty
                            ? errorMsg
                            : 'Failed to delete event.'),
                        backgroundColor: AppColors.error,
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionListTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDestructive ? AppColors.error : AppColors.charcoal,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: isDestructive ? AppColors.error.withValues(alpha: 0.6) : AppColors.textTertiary,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final eventProvider = context.watch<EventProvider>();
    final allEvents = eventProvider.events;

    final filteredEvents = allEvents.where((e) {
      if (_selectedFilter == 'active' && e.status != 'active') return false;
      if (_selectedFilter == 'archived' && e.status == 'active') return false;

      if (_searchQuery.isEmpty) return true;
      return e.name.toLowerCase().contains(_searchQuery) ||
          (e.location?.toLowerCase().contains(_searchQuery) ?? false) ||
          e.slug.toLowerCase().contains(_searchQuery);
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.creamCanvas,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            const Text('All Events'),
            const SizedBox(width: 10),
            HeroBadge(
              label: '${allEvents.length}',
              variant: HeroBadgeVariant.flat,
              color: HeroBadgeColor.primary,
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search & Filter Section
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Column(
              children: [
                HeroCard(
                  borderRadius: 18,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Search events by name, venue, or slug...',
                      hintStyle: const TextStyle(
                        fontSize: 13.5,
                        color: AppColors.textTertiary,
                      ),
                      prefixIcon: const Icon(
                        Icons.search_rounded,
                        color: AppColors.brandOrange,
                        size: 22,
                      ),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close_rounded, size: 18),
                              onPressed: () => _searchController.clear(),
                            )
                          : null,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      fillColor: Colors.transparent,
                      filled: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Filter Segmented Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: [
                      _buildFilterPill(
                        label: 'All Portals',
                        filterValue: 'all',
                        count: allEvents.length,
                      ),
                      const SizedBox(width: 8),
                      _buildFilterPill(
                        label: 'Active',
                        filterValue: 'active',
                        count: allEvents.where((e) => e.status == 'active').length,
                      ),
                      const SizedBox(width: 8),
                      _buildFilterPill(
                        label: 'Archived',
                        filterValue: 'archived',
                        count: allEvents.where((e) => e.status != 'active').length,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Events List or Empty State
          Expanded(
            child: RefreshIndicator(
              onRefresh: eventProvider.fetchEvents,
              color: AppColors.brandOrange,
              child: filteredEvents.isEmpty
                  ? (eventProvider.isLoading
                      ? const Center(
                          child: CircularProgressIndicator(color: AppColors.brandOrange),
                        )
                      : _buildEmptyState(context))
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 10, 20, 96),
                      itemCount: filteredEvents.length,
                      separatorBuilder: (_, index) => const SizedBox(height: 14),
                      itemBuilder: (ctx, index) {
                        final event = filteredEvents[index];
                        return _buildEventCard(context, event);
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterPill({
    required String label,
    required String filterValue,
    required int count,
  }) {
    final isSelected = _selectedFilter == filterValue;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedFilter = filterValue;
          });
        },
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.charcoal : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? AppColors.charcoal
                  : AppColors.border.withValues(alpha: 0.6),
              width: 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.charcoal.withValues(alpha: 0.18),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: const Color(0xFF2D1807).withValues(alpha: 0.02),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                  color: isSelected ? Colors.white : AppColors.charcoalMuted,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.22)
                      : AppColors.creamCanvas,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEventCard(BuildContext context, Event event) {
    final formattedDate = event.date != null
        ? DateFormat('MMM d, yyyy').format(event.date!)
        : 'Date not set';

    final isActive = event.status == 'active';

    return HeroCard(
      isPressable: true,
      borderRadius: 22,
      padding: const EdgeInsets.all(18),
      border: Border.all(
        color: AppColors.border.withValues(alpha: 0.6),
        width: 1,
      ),
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => EventDetailScreen(event: event),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Event Icon Squircle
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.brandOrangeSubtle,
                      Colors.white,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.brandOrange.withValues(alpha: 0.25),
                    width: 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.brandOrange.withValues(alpha: 0.08),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.event_note_rounded,
                  color: AppColors.brandOrange,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              // Event Name & Location
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.name,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 5),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 2,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.calendar_today_rounded,
                              size: 12,
                              color: AppColors.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              formattedDate,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        if (event.location != null && event.location!.isNotEmpty)
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text(
                                '•',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textTertiary,
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(
                                Icons.location_on_outlined,
                                size: 12,
                                color: AppColors.textSecondary,
                              ),
                              const SizedBox(width: 2),
                              ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 120),
                                child: Text(
                                  event.location!,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              // Status Pill & More Button
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  HeroBadge(
                    label: event.status.toUpperCase(),
                    variant: HeroBadgeVariant.dot,
                    color: isActive ? HeroBadgeColor.success : HeroBadgeColor.warning,
                  ),
                  const SizedBox(width: 4),
                  IconButton(
                    icon: const Icon(
                      Icons.more_vert_rounded,
                      color: AppColors.textSecondary,
                      size: 20,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    splashRadius: 18,
                    onPressed: () => _showEventActionSheet(event),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            height: 1,
            color: AppColors.borderLight.withValues(alpha: 0.8),
          ),
          const SizedBox(height: 12),
          // Bottom stats and Quick Actions
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 8,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.creamCanvas,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.border.withValues(alpha: 0.5),
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.photo_library_outlined,
                          size: 14,
                          color: AppColors.charcoal,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '${event.totalPhotos} Photos',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.charcoal,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (event.indexedPhotos > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.brandOrangeSubtle,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.face_retouching_natural_rounded,
                            size: 14,
                            color: AppColors.brandOrange,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '${event.indexedPhotos} Indexed',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.brandOrange,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              HeroButton(
                text: 'Manage',
                icon: const Icon(Icons.arrow_forward_rounded, size: 13),
                size: HeroButtonSize.sm,
                variant: HeroButtonVariant.light,
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => EventDetailScreen(event: event),
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(28, 16, 28, 96),
        child: HeroCard(
            borderRadius: 24,
            padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: AppColors.brandOrangeSubtle,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.brandOrange.withValues(alpha: 0.25),
                      width: 1.5,
                    ),
                  ),
                  child: const Icon(
                    Icons.folder_open_rounded,
                    size: 32,
                    color: AppColors.brandOrange,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  _searchQuery.isNotEmpty ? 'No Events Found' : 'No Events Created Yet',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.3,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  _searchQuery.isNotEmpty
                      ? 'No events match "$_searchQuery". Try searching by another keyword or reset the filter.'
                      : 'Create your first event to start capturing, organizing, and indexing attendee photos in real-time.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                ),
                const SizedBox(height: 24),
                HeroButton(
                  text: _searchQuery.isNotEmpty ? 'Clear Search' : 'Create New Event',
                  icon: Icon(
                    _searchQuery.isNotEmpty ? Icons.close_rounded : Icons.add_rounded,
                    size: 18,
                  ),
                  variant: HeroButtonVariant.solid,
                  size: HeroButtonSize.md,
                  onPressed: () {
                    if (_searchQuery.isNotEmpty) {
                      _searchController.clear();
                      setState(() {
                        _selectedFilter = 'all';
                      });
                    } else {
                      CreateEventDialog.show(context);
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      );
  }
}
