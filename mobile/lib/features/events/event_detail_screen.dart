import "package:cached_network_image/cached_network_image.dart";
import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:intl/intl.dart";
import "package:provider/provider.dart";
import "package:qr_flutter/qr_flutter.dart";
import "package:share_plus/share_plus.dart";
import "../../core/api/api_client.dart";
import "../../core/theme/app_theme.dart";
import "../../core/widgets/hero_components.dart";
import "../../models/event.dart";
import "../../models/index_status.dart";
import "../../models/person.dart";
import "../../models/photo.dart";
import "../../providers/event_provider.dart";
import "../gallery/photo_viewer_screen.dart";
import "../photos/photo_upload_screen.dart";

class EventDetailScreen extends StatefulWidget {
  final Event event;

  const EventDetailScreen({super.key, required this.event});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  late Event _currentEvent;
  // 0: Photos (Gallery), 1: People & Faces, 2: Details & QR
  int _activeTabIndex = 0;
  String? _selectedPersonId;

  @override
  void initState() {
    super.initState();
    _currentEvent = widget.event;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAllEventData();
    });
  }

  void _loadAllEventData() {
    final provider = context.read<EventProvider>();
    provider.fetchIndexStatus(_currentEvent.id);
    provider.fetchEventPeople(_currentEvent.id);
    provider.fetchEventPhotos(_currentEvent.id, personId: _selectedPersonId);
  }

  String get _guestUrl =>
      "${ApiClient.defaultWebBaseUrl}/e/${_currentEvent.slug}";

  void _copyGuestUrl() {
    Clipboard.setData(ClipboardData(text: _guestUrl));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
            SizedBox(width: 10),
            Text(
              "Guest link copied to clipboard!",
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ],
        ),
        backgroundColor: AppColors.charcoal,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  void _shareGuestUrl() {
    HapticFeedback.selectionClick();
    SharePlus.instance.share(
      ShareParams(
        text: "Find your photos from ${_currentEvent.name}: $_guestUrl",
      ),
    );
  }

  Future<void> _pickAndUploadPhotos() async {
    final uploaded = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => PhotoUploadScreen(event: _currentEvent),
      ),
    );

    if (uploaded == true && mounted) {
      _loadAllEventData();
      await context.read<EventProvider>().fetchEvents();
    }
  }

  Future<void> _confirmDelete() async {
    final navigator = Navigator.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        contentPadding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.errorBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.delete_outline_rounded,
                color: AppColors.error,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            const Text(
              "Delete Event?",
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.charcoal,
              ),
            ),
          ],
        ),
        content: Text(
          "Are you sure you want to delete '${_currentEvent.name}'? This action will remove all indexed photos and cannot be undone.",
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary,
            height: 1.45,
          ),
        ),
        actions: [
          Row(
            children: [
              Expanded(
                child: HeroButton(
                  variant: HeroButtonVariant.light,
                  size: HeroButtonSize.md,
                  text: "Cancel",
                  color: AppColors.textSecondary,
                  onPressed: () => Navigator.pop(ctx, false),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: HeroButton(
                  variant: HeroButtonVariant.solid,
                  size: HeroButtonSize.md,
                  text: "Delete",
                  color: AppColors.error,
                  onPressed: () => Navigator.pop(ctx, true),
                ),
              ),
            ],
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

  void _showEnlargeQrModal(BuildContext context) {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: EdgeInsets.fromLTRB(
            24,
            12,
            24,
            24 + MediaQuery.paddingOf(ctx).bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Drag handle
                Center(
                  child: Container(
                    width: 44,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),

              // Title Header
              Text(
                _currentEvent.name,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: AppColors.charcoal,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                "Scan with phone camera to find your photos",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),

              // Large QR Standee Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: AppColors.border.withValues(alpha: 0.7),
                    width: 1.2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2D1807).withValues(alpha: 0.08),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                      spreadRadius: -2,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    QrImageView(
                      data: _guestUrl,
                      version: QrVersions.auto,
                      size: 210.0,
                      eyeStyle: const QrEyeStyle(
                        eyeShape: QrEyeShape.square,
                        color: AppColors.charcoal,
                      ),
                      dataModuleStyle: const QrDataModuleStyle(
                        dataModuleShape: QrDataModuleShape.square,
                        color: AppColors.charcoal,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.qr_code_scanner_rounded,
                          size: 13,
                          color: AppColors.textTertiary.withValues(alpha: 0.9),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          "SCAN TO FIND YOUR PHOTOS",
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textTertiary.withValues(alpha: 0.9),
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // PIN Badge if available
              if (_currentEvent.pin != null && _currentEvent.pin!.isNotEmpty) ...[
                HeroBadge(
                  label: "Access PIN: ${_currentEvent.pin!}",
                  variant: HeroBadgeVariant.solid,
                  color: HeroBadgeColor.neutral,
                  icon: const Icon(Icons.lock_rounded, size: 12, color: Colors.white),
                ),
                const SizedBox(height: 12),
              ],

              // Guest Link Chip
              GestureDetector(
                onTap: _copyGuestUrl,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.creamSurface.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.border.withValues(alpha: 0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.link_rounded,
                        size: 16,
                        color: AppColors.brandOrange,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _guestUrl,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.charcoalMuted,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const HeroBadge(
                        label: "COPY",
                        variant: HeroBadgeVariant.flat,
                        color: HeroBadgeColor.primary,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Actions
              Row(
                children: [
                  Expanded(
                    child: HeroButton(
                      variant: HeroButtonVariant.bordered,
                      size: HeroButtonSize.md,
                      text: "Done",
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: HeroButton(
                      variant: HeroButtonVariant.solid,
                      size: HeroButtonSize.md,
                      icon: const Icon(Icons.share_rounded, size: 16, color: Colors.white),
                      text: "Share Link",
                      onPressed: () {
                        Navigator.pop(ctx);
                        _shareGuestUrl();
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final eventProvider = context.watch<EventProvider>();
    final indexStatus = eventProvider.indexStatus;
    final photos = eventProvider.photos;
    final people = eventProvider.people;

    // Reactively grab the latest version of this event from provider
    final updatedEvent = eventProvider.events.cast<Event?>().firstWhere(
          (e) => e?.id == widget.event.id,
          orElse: () => null,
        );
    if (updatedEvent != null) {
      _currentEvent = updatedEvent;
    }

    final formattedDate = _currentEvent.date != null
        ? DateFormat("MMMM d, yyyy").format(_currentEvent.date!)
        : "Date not set";

    return Scaffold(
      backgroundColor: AppColors.creamCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.creamCanvas,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _currentEvent.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppColors.charcoal,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              formattedDate,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: AppColors.textTertiary,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.border.withValues(alpha: 0.6),
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.charcoal.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.share_rounded,
                size: 17,
                color: AppColors.charcoal,
              ),
            ),
            tooltip: "Share Guest Link",
            onPressed: _shareGuestUrl,
          ),
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.border.withValues(alpha: 0.6),
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.charcoal.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(
                Icons.delete_outline_rounded,
                size: 17,
                color: AppColors.error,
              ),
            ),
            tooltip: "Delete Event",
            onPressed: _confirmDelete,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // Segmented Tabs: [Photos (Gallery)], [People & Faces], [Details & QR]
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: HeroPillTabs(
                selectedIndex: _activeTabIndex,
                onTabSelected: (index) {
                  setState(() => _activeTabIndex = index);
                  if (index == 0) {
                    eventProvider.fetchEventPhotos(
                      _currentEvent.id,
                      personId: _selectedPersonId,
                    );
                  } else if (index == 1) {
                    eventProvider.fetchEventPeople(_currentEvent.id);
                  } else if (index == 2) {
                    eventProvider.fetchIndexStatus(_currentEvent.id);
                  }
                },
                tabs: [
                  HeroPillTabItem(
                    label: "Photos",
                    icon: Icons.photo_library_rounded,
                    badge: photos.isNotEmpty ? "${photos.length}" : null,
                  ),
                  HeroPillTabItem(
                    label: "People",
                    icon: Icons.face_rounded,
                    badge: people.isNotEmpty ? "${people.length}" : null,
                  ),
                  const HeroPillTabItem(
                    label: "Details",
                    icon: Icons.qr_code_2_rounded,
                  ),
                ],
              ),
            ),

            // Tab Content via IndexedStack
            Expanded(
              child: IndexedStack(
                index: _activeTabIndex,
                children: [
                  // Tab 0: Photos (Gallery)
                  _buildPhotosTab(photos, people, indexStatus, eventProvider),

                  // Tab 1: People & Faces
                  _buildPeopleTab(people, eventProvider),

                  // Tab 2: Details & QR
                  _buildDetailsTab(indexStatus, formattedDate, people, photos),
                ],
              ),
            ),
          ],
        ),
      ),
      // Clean fixed bottom bar with "Upload Photos" CTA
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(
          20,
          12,
          20,
          14 + MediaQuery.paddingOf(context).bottom,
        ),
        decoration: BoxDecoration(
          color: AppColors.white,
          border: Border(
            top: BorderSide(
              color: AppColors.border.withValues(alpha: 0.5),
            ),
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.charcoal.withValues(alpha: 0.04),
              blurRadius: 16,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: HeroButton(
          variant: HeroButtonVariant.shadow,
          size: HeroButtonSize.lg,
          isFullWidth: true,
          icon: const Icon(
            Icons.cloud_upload_rounded,
            color: Colors.white,
            size: 20,
          ),
          text: "Upload Photos",
          onPressed: _pickAndUploadPhotos,
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 0: PHOTOS (GALLERY)
  // ---------------------------------------------------------------------------
  Widget _buildPhotosTab(
    List<EventPhoto> photos,
    List<EventPerson> people,
    IndexStatus indexStatus,
    EventProvider provider,
  ) {
    if (provider.isLoadingGallery) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.brandOrange),
      );
    }

    final selectedPerson = _selectedPersonId != null
        ? people.cast<EventPerson?>().firstWhere(
              (p) => p?.personId == _selectedPersonId,
              orElse: () => null,
            )
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Filter Banner if person filter is active
        if (_selectedPersonId != null)
          Container(
            margin: const EdgeInsets.fromLTRB(20, 0, 20, 10),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.brandOrangeSubtle,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: AppColors.brandOrange.withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.filter_alt_rounded,
                  size: 16,
                  color: AppColors.brandOrange,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "Filtered by ${selectedPerson?.label ?? 'Person'}",
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.brandOrangeDark,
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    setState(() => _selectedPersonId = null);
                    provider.fetchEventPhotos(_currentEvent.id);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppColors.brandOrange.withValues(alpha: 0.35),
                      ),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.close_rounded,
                          size: 13,
                          color: AppColors.brandOrangeDark,
                        ),
                        SizedBox(width: 3),
                        Text(
                          "Clear",
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.brandOrangeDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          )
        else
          // Photo Count Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 2, 20, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "${photos.length} ${photos.length == 1 ? 'Photo' : 'Photos'}",
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.charcoal,
                    letterSpacing: -0.2,
                  ),
                ),
                if (indexStatus.isIndexing)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.brandOrange,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        "Indexing in progress...",
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.brandOrange,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),

        // Grid or Empty State
        Expanded(
          child: photos.isEmpty
              ? Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    child: HeroCard(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: const BoxDecoration(
                              color: AppColors.brandOrangeSubtle,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.photo_library_rounded,
                              size: 30,
                              color: AppColors.brandOrange,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            _selectedPersonId != null
                                ? "No Photos Found for ${selectedPerson?.label ?? 'Person'}"
                                : "No Photos in Gallery",
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.charcoal,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _selectedPersonId != null
                                ? "Try clearing the filter or uploading more event photos."
                                : "Upload your event photos to automatically discover faces and build the guest gallery.",
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: AppColors.textSecondary,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 18),
                          if (_selectedPersonId != null)
                            HeroButton(
                              variant: HeroButtonVariant.bordered,
                              size: HeroButtonSize.md,
                              text: "Clear Filter",
                              onPressed: () {
                                setState(() => _selectedPersonId = null);
                                provider.fetchEventPhotos(_currentEvent.id);
                              },
                            )
                          else
                            HeroButton(
                              variant: HeroButtonVariant.solid,
                              size: HeroButtonSize.md,
                              icon: const Icon(
                                Icons.cloud_upload_rounded,
                                size: 16,
                                color: Colors.white,
                              ),
                              text: "Upload Photos",
                              onPressed: _pickAndUploadPhotos,
                            ),
                        ],
                      ),
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: AppColors.brandOrange,
                  onRefresh: () => provider.fetchEventPhotos(
                    _currentEvent.id,
                    personId: _selectedPersonId,
                  ),
                  child: GridView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 2, 20, 36),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                      childAspectRatio: 1.0,
                    ),
                    itemCount: photos.length,
                    itemBuilder: (context, index) {
                      final photo = photos[index];
                      return GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => PhotoViewerScreen(
                                photo: photo,
                                eventName: _currentEvent.name,
                              ),
                            ),
                          );
                        },
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: CachedNetworkImage(
                            imageUrl: photo.url,
                            fit: BoxFit.cover,
                            placeholder: (_, _) => Container(
                              color: AppColors.creamSurface,
                            ),
                            errorWidget: (_, _, _) => Container(
                              color: AppColors.creamSurface,
                              child: const Icon(
                                Icons.broken_image_rounded,
                                size: 24,
                                color: AppColors.textTertiary,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 1: PEOPLE & FACES
  // ---------------------------------------------------------------------------
  Widget _buildPeopleTab(List<EventPerson> people, EventProvider provider) {
    if (provider.isLoadingPeople) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.brandOrange),
      );
    }

    if (people.isEmpty) {
      return Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: HeroCard(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 68,
                  height: 68,
                  decoration: const BoxDecoration(
                    color: AppColors.brandOrangeSubtle,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.face_retouching_natural_rounded,
                    size: 34,
                    color: AppColors.brandOrange,
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  "No People Discovered Yet",
                  style: TextStyle(
                    fontSize: 16.5,
                    fontWeight: FontWeight.bold,
                    color: AppColors.charcoal,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  "Upload photos to trigger AI facial recognition. Discovered guests will automatically appear here as story circles.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12.5,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 20),
                HeroButton(
                  variant: HeroButtonVariant.solid,
                  size: HeroButtonSize.md,
                  icon: const Icon(
                    Icons.cloud_upload_rounded,
                    size: 16,
                    color: Colors.white,
                  ),
                  text: "Upload Photos Now",
                  onPressed: _pickAndUploadPhotos,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: AppColors.brandOrange,
      onRefresh: () => provider.fetchEventPeople(_currentEvent.id),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header info
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 2, 20, 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Recognized People (${people.length})",
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.charcoal,
                    letterSpacing: -0.2,
                  ),
                ),
                const Text(
                  "Tap to filter photos",
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),

          // 3-Column Grid of Recognized Face Circles
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(20, 2, 20, 36),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 12,
                mainAxisSpacing: 16,
                childAspectRatio: 0.69,
              ),
              itemCount: people.length,
              itemBuilder: (context, index) {
                final person = people[index];
                final isSelected = _selectedPersonId == person.personId;

                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.selectionClick();
                    setState(() {
                      _selectedPersonId = person.personId;
                      _activeTabIndex = 0; // Jump to Photos tab with filter
                    });
                    provider.fetchEventPhotos(
                      _currentEvent.id,
                      personId: person.personId,
                    );
                  },
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Face circle avatar
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected
                                ? AppColors.brandOrange
                                : AppColors.border.withValues(alpha: 0.6),
                            width: isSelected ? 2.5 : 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: isSelected
                                  ? AppColors.brandOrange.withValues(alpha: 0.25)
                                  : AppColors.charcoal.withValues(alpha: 0.05),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: person.coverThumbUrl.isNotEmpty
                              ? CachedNetworkImage(
                                  imageUrl: person.coverThumbUrl,
                                  fit: BoxFit.cover,
                                  placeholder: (_, _) => Container(
                                    color: AppColors.creamSurface,
                                  ),
                                  errorWidget: (_, _, _) => Container(
                                    color: AppColors.creamSurface,
                                    child: const Icon(
                                      Icons.person_rounded,
                                      size: 32,
                                      color: AppColors.textTertiary,
                                    ),
                                  ),
                                )
                              : Container(
                                  color: AppColors.creamSurface,
                                  child: const Icon(
                                    Icons.person_rounded,
                                    size: 32,
                                    color: AppColors.textTertiary,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Person Label
                      Flexible(
                        child: Text(
                          person.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isSelected
                                ? AppColors.brandOrange
                                : AppColors.charcoal,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 3),

                      // Photo Count Pill
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.creamSurface.withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: AppColors.border.withValues(alpha: 0.4),
                            ),
                          ),
                          child: Text(
                            "${person.photoCount} photos",
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // TAB 2: DETAILS & QR
  // ---------------------------------------------------------------------------
  Widget _buildDetailsTab(
    IndexStatus indexStatus,
    String formattedDate,
    List<EventPerson> people,
    List<EventPhoto> photos,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 48),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Sleek Compact "Guest Portal" Panel
          HeroCard(
            padding: const EdgeInsets.all(18),
            borderRadius: 22,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            "Guest Portal",
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.charcoal,
                              letterSpacing: -0.3,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            "Guests scan to find photos via face AI",
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (_currentEvent.pin != null &&
                        _currentEvent.pin!.isNotEmpty)
                      HeroBadge(
                        label: "PIN ${_currentEvent.pin!}",
                        variant: HeroBadgeVariant.flat,
                        color: HeroBadgeColor.warning,
                        icon: const Icon(
                          Icons.lock_rounded,
                          size: 11,
                          color: AppColors.warning,
                        ),
                      )
                    else
                      const HeroBadge(
                        label: "Live",
                        variant: HeroBadgeVariant.dot,
                        color: HeroBadgeColor.success,
                      ),
                  ],
                ),
                const SizedBox(height: 14),

                // Compact QR Preview + Guest Link & Enlarge action
                Row(
                  children: [
                    // Compact QR Preview tile
                    GestureDetector(
                      onTap: () => _showEnlargeQrModal(context),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: AppColors.border.withValues(alpha: 0.65),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.charcoal.withValues(alpha: 0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            QrImageView(
                              data: _guestUrl,
                              version: QrVersions.auto,
                              size: 78.0,
                              eyeStyle: const QrEyeStyle(
                                eyeShape: QrEyeShape.square,
                                color: AppColors.charcoal,
                              ),
                              dataModuleStyle: const QrDataModuleStyle(
                                dataModuleShape: QrDataModuleShape.square,
                                color: AppColors.charcoal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Portal details & Enlarge button
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // URL chip
                          GestureDetector(
                            onTap: _copyGuestUrl,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 7,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.creamSurface
                                    .withValues(alpha: 0.6),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: AppColors.border
                                      .withValues(alpha: 0.45),
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.link_rounded,
                                    size: 14,
                                    color: AppColors.brandOrange,
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      _guestUrl,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.charcoalMuted,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Enlarge / Print QR CTA
                          SizedBox(
                            width: double.infinity,
                            child: HeroButton(
                              variant: HeroButtonVariant.bordered,
                              size: HeroButtonSize.sm,
                              icon: const Icon(
                                Icons.fullscreen_rounded,
                                size: 16,
                                color: AppColors.brandOrange,
                              ),
                              text: "Enlarge / Print QR",
                              onPressed: () => _showEnlargeQrModal(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Copy Link & Share Actions
                Row(
                  children: [
                    Expanded(
                      child: HeroButton(
                        variant: HeroButtonVariant.light,
                        size: HeroButtonSize.sm,
                        icon: const Icon(Icons.copy_rounded, size: 14),
                        text: "Copy Link",
                        onPressed: _copyGuestUrl,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: HeroButton(
                        variant: HeroButtonVariant.solid,
                        size: HeroButtonSize.sm,
                        icon: const Icon(
                          Icons.share_rounded,
                          size: 14,
                          color: Colors.white,
                        ),
                        text: "Share",
                        onPressed: _shareGuestUrl,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. AI Indexing Status Bar (Total, Indexed, Failed)
          HeroCard(
            padding: const EdgeInsets.all(18),
            borderRadius: 22,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: AppColors.brandOrangeSubtle,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.psychology_rounded,
                        color: AppColors.brandOrange,
                        size: 19,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Flexible(
                                child: Text(
                                  "Face Indexing",
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.charcoal,
                                    letterSpacing: -0.3,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              _buildIndexingStatusBadge(indexStatus),
                            ],
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            "Facial embeddings & vectors",
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.refresh_rounded, size: 20),
                      color: AppColors.charcoalMuted,
                      tooltip: "Refresh indexing status",
                      onPressed: () => context
                          .read<EventProvider>()
                          .fetchIndexStatus(_currentEvent.id),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // Pipeline Progress Bar
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Pipeline Progress",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      "${(indexStatus.progressRatio * 100).toInt()}%",
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.brandOrange,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                Container(
                  height: 8,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.creamSurface,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: AppColors.border.withValues(alpha: 0.4),
                    ),
                  ),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return Align(
                        alignment: Alignment.centerLeft,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 350),
                          curve: Curves.easeOutCubic,
                          width: constraints.maxWidth *
                              indexStatus.progressRatio,
                          decoration: BoxDecoration(
                            gradient: AppColors.orangeGradient,
                            borderRadius: BorderRadius.circular(6),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.brandOrange
                                    .withValues(alpha: 0.35),
                                blurRadius: 6,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 16),

                // Clean 3-Metric Tiles: Total, Indexed, Failed
                Row(
                  children: [
                    Expanded(
                      child: _buildMetricTile(
                        label: "Total",
                        value: "${indexStatus.totalPhotos}",
                        icon: Icons.photo_library_outlined,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildMetricTile(
                        label: "Indexed",
                        value: "${indexStatus.indexedPhotos}",
                        icon: Icons.check_circle_outline_rounded,
                        accentColor: AppColors.success,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildMetricTile(
                        label: "Failed",
                        value: "${indexStatus.failedPhotos}",
                        icon: Icons.error_outline_rounded,
                        accentColor: indexStatus.failedPhotos > 0
                            ? AppColors.error
                            : AppColors.textTertiary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 3. Quick People Strip (if people recognized)
          if (people.isNotEmpty) ...[
            HeroCard(
              padding: const EdgeInsets.all(18),
              borderRadius: 22,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.people_alt_rounded,
                            size: 18,
                            color: AppColors.brandOrange,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            "Recognized People (${people.length})",
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.charcoal,
                            ),
                          ),
                        ],
                      ),
                      TextButton(
                        onPressed: () => setState(() => _activeTabIndex = 1),
                        child: const Text(
                          "View All",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 96,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: people.take(8).length,
                      separatorBuilder: (_, _) => const SizedBox(width: 14),
                      itemBuilder: (context, idx) {
                        final person = people[idx];
                        return GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedPersonId = person.personId;
                              _activeTabIndex = 0; // jump to photos filtered by person
                            });
                            context
                                .read<EventProvider>()
                                .fetchEventPhotos(
                                  _currentEvent.id,
                                  personId: person.personId,
                                );
                          },
                          child: Column(
                            children: [
                              Container(
                                width: 54,
                                height: 54,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppColors.brandOrange,
                                    width: 2,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.brandOrange
                                          .withValues(alpha: 0.15),
                                      blurRadius: 8,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: ClipOval(
                                  child: person.coverThumbUrl.isNotEmpty
                                      ? CachedNetworkImage(
                                          imageUrl: person.coverThumbUrl,
                                          fit: BoxFit.cover,
                                          errorWidget: (_, _, _) => const Icon(
                                            Icons.person,
                                            color: AppColors.textTertiary,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.person,
                                          color: AppColors.textTertiary,
                                        ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                "${person.photoCount} photos",
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // 4. Event Overview Card
          HeroCard(
            padding: const EdgeInsets.all(18),
            borderRadius: 22,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.info_outline_rounded,
                      size: 18,
                      color: AppColors.brandOrange,
                    ),
                    SizedBox(width: 8),
                    Text(
                      "Event Details",
                      style: TextStyle(
                        fontSize: 15.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.charcoal,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _buildDetailRow(
                  icon: Icons.calendar_today_rounded,
                  label: "Event Date",
                  value: formattedDate,
                ),
                if (_currentEvent.location != null &&
                    _currentEvent.location!.isNotEmpty) ...[
                  _buildDivider(),
                  _buildDetailRow(
                    icon: Icons.place_outlined,
                    label: "Venue / City",
                    value: _currentEvent.location!,
                  ),
                ],
                _buildDivider(),
                _buildDetailRow(
                  icon: Icons.photo_camera_back_rounded,
                  label: "Total Photos",
                  value: "${_currentEvent.totalPhotos} photos",
                ),
                if (_currentEvent.pin != null &&
                    _currentEvent.pin!.isNotEmpty) ...[
                  _buildDivider(),
                  _buildDetailRow(
                    icon: Icons.lock_outline_rounded,
                    label: "Access PIN",
                    valueWidget: HeroBadge(
                      label: _currentEvent.pin!,
                      variant: HeroBadgeVariant.solid,
                      color: HeroBadgeColor.neutral,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // HELPER WIDGETS
  // ---------------------------------------------------------------------------
  Widget _buildIndexingStatusBadge(IndexStatus indexStatus) {
    if (indexStatus.isIndexing) {
      return const HeroBadge(
        label: "INDEXING",
        variant: HeroBadgeVariant.solid,
        color: HeroBadgeColor.warning,
      );
    }
    if (indexStatus.isCompleted) {
      return const HeroBadge(
        label: "INDEXED",
        variant: HeroBadgeVariant.flat,
        color: HeroBadgeColor.success,
      );
    }
    return HeroBadge(
      label: indexStatus.status.toUpperCase(),
      variant: HeroBadgeVariant.flat,
      color: HeroBadgeColor.neutral,
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required IconData icon,
    Color? accentColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.creamSurface.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.border.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 18,
            color: accentColor ?? AppColors.textSecondary,
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              maxLines: 1,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: accentColor ?? AppColors.charcoal,
                letterSpacing: -0.3,
              ),
            ),
          ),
          const SizedBox(height: 2),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              label,
              maxLines: 1,
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: AppColors.textTertiary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    String? value,
    Widget? valueWidget,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: AppColors.creamSurface.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 16, color: AppColors.charcoalMuted),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        if (valueWidget != null)
          valueWidget
        else if (value != null)
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.charcoal,
            ),
          ),
      ],
    );
  }

  Widget _buildDivider() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Divider(
        height: 1,
        thickness: 1,
        color: AppColors.borderLight.withValues(alpha: 0.7),
      ),
    );
  }
}
