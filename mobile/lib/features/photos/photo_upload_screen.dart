import "dart:io";
import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:image_picker/image_picker.dart";
import "package:provider/provider.dart";
import "../../core/theme/app_theme.dart";
import "../../core/widgets/hero_components.dart";
import "../../models/event.dart";
import "../../providers/event_provider.dart";

class PhotoUploadScreen extends StatefulWidget {
  final Event event;

  const PhotoUploadScreen({super.key, required this.event});

  @override
  State<PhotoUploadScreen> createState() => _PhotoUploadScreenState();
}

class _PhotoUploadScreenState extends State<PhotoUploadScreen> {
  final ImagePicker _picker = ImagePicker();
  final List<XFile> _selectedFiles = [];
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  int _uploadedCount = 0;

  Future<void> _pickImages() async {
    HapticFeedback.lightImpact();
    try {
      final List<XFile> images = await _picker.pickMultiImage(
        imageQuality: 85,
      );
      if (images.isNotEmpty) {
        setState(() {
          _selectedFiles.addAll(images);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Failed to pick images: $e"),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  Future<void> _takePhoto() async {
    HapticFeedback.lightImpact();
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 90,
      );
      if (photo != null) {
        setState(() {
          _selectedFiles.add(photo);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Camera error: $e"),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  void _removeFile(int index) {
    if (_isUploading) return;
    HapticFeedback.selectionClick();
    setState(() {
      _selectedFiles.removeAt(index);
    });
  }

  void _showAddOptions() {
    if (_isUploading) return;
    HapticFeedback.selectionClick();
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                "Add Photos",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.charcoal,
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.brandOrangeSubtle,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.photo_library_rounded,
                    color: AppColors.brandOrange,
                    size: 20,
                  ),
                ),
                title: const Text(
                  "Choose from Gallery",
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImages();
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.brandOrangeSubtle,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.camera_alt_rounded,
                    color: AppColors.brandOrange,
                    size: 20,
                  ),
                ),
                title: const Text(
                  "Take Photo",
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _takePhoto();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _startUpload() async {
    if (_selectedFiles.isEmpty || _isUploading) return;
    HapticFeedback.mediumImpact();

    setState(() {
      _isUploading = true;
      _uploadProgress = 0.0;
      _uploadedCount = 0;
    });

    final total = _selectedFiles.length;
    final provider = context.read<EventProvider>();

    try {
      final success = await provider.uploadAndIndexPhotos(
        eventId: widget.event.id,
        files: _selectedFiles,
        onProgress: (current, count, status) {
          if (mounted) {
            setState(() {
              _uploadedCount = current;
              _uploadProgress = count > 0 ? (current / count).clamp(0.0, 1.0) : 0.0;
            });
          }
        },
      );

      if (!mounted) return;

      if (success) {
        HapticFeedback.lightImpact();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    "Successfully uploaded $total photo${total == 1 ? '' : 's'}! AI face indexing started.",
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
        );

        await Future.delayed(const Duration(milliseconds: 650));
        if (mounted) {
          Navigator.pop(context, true);
        }
      } else {
        final err = provider.errorMessage ?? "Failed to upload photos.";
        setState(() {
          _isUploading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(err),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Upload error: $e"),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.creamCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.creamCanvas,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text(
          "Upload Photos",
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppColors.charcoal,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          if (_selectedFiles.isNotEmpty && !_isUploading) ...[
            IconButton(
              tooltip: "Add More Photos",
              icon: const Icon(Icons.add_photo_alternate_outlined, color: AppColors.brandOrange),
              onPressed: _showAddOptions,
            ),
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: TextButton(
                onPressed: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedFiles.clear());
                },
                child: const Text(
                  "Clear",
                  style: TextStyle(
                    color: AppColors.error,
                    fontWeight: FontWeight.w600,
                    fontSize: 13.5,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
      body: Column(
        children: [
          // Top: Compact Event Name Banner + Clear Batch Upload Status
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: AppColors.border.withValues(alpha: 0.65),
                ),
                boxShadow: AppShadows.card,
              ),
              child: Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.brandOrangeSubtle,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.event_note_rounded,
                      color: AppColors.brandOrange,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.event.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.charcoal,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "${_selectedFiles.length} photo${_selectedFiles.length == 1 ? '' : 's'} selected",
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_isUploading)
                    const HeroBadge(
                      label: "UPLOADING",
                      variant: HeroBadgeVariant.solid,
                      color: HeroBadgeColor.warning,
                    )
                  else if (_selectedFiles.isNotEmpty)
                    HeroBadge(
                      label: "${_selectedFiles.length} READY",
                      variant: HeroBadgeVariant.flat,
                      color: HeroBadgeColor.primary,
                    )
                  else
                    const HeroBadge(
                      label: "0 READY",
                      variant: HeroBadgeVariant.flat,
                      color: HeroBadgeColor.neutral,
                    ),
                ],
              ),
            ),
          ),

          // Middle Area: Empty State Picker Card or 3-Column Image Grid
          Expanded(
            child: _selectedFiles.isEmpty
                ? Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                        decoration: BoxDecoration(
                          color: AppColors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: AppColors.border.withValues(alpha: 0.7),
                          ),
                          boxShadow: AppShadows.card,
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 68,
                              height: 68,
                              decoration: BoxDecoration(
                                color: AppColors.brandOrangeSubtle,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: AppColors.brandOrange.withValues(alpha: 0.2),
                                  width: 1.5,
                                ),
                              ),
                              child: const Icon(
                                Icons.add_photo_alternate_rounded,
                                size: 34,
                                color: AppColors.brandOrange,
                              ),
                            ),
                            const SizedBox(height: 18),
                            const Text(
                              "No Photos Selected",
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                color: AppColors.charcoal,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              "Choose photos from your gallery or capture live shots with your camera. Photos will be automatically indexed with AI face recognition.",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                                height: 1.45,
                              ),
                            ),
                            const SizedBox(height: 24),
                            HeroButton(
                              variant: HeroButtonVariant.solid,
                              size: HeroButtonSize.md,
                              isFullWidth: true,
                              icon: const Icon(Icons.photo_library_rounded, size: 18),
                              text: "Choose from Gallery",
                              onPressed: _pickImages,
                            ),
                            const SizedBox(height: 10),
                            HeroButton(
                              variant: HeroButtonVariant.bordered,
                              size: HeroButtonSize.md,
                              isFullWidth: true,
                              icon: const Icon(Icons.camera_alt_rounded, size: 18),
                              text: "Take Photo",
                              onPressed: _takePhoto,
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                : Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: GridView.builder(
                      padding: const EdgeInsets.only(top: 4, bottom: 12),
                      physics: const BouncingScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                        childAspectRatio: 1.0,
                      ),
                      itemCount: _selectedFiles.length + (_isUploading ? 0 : 1),
                      itemBuilder: (context, index) {
                        if (index == _selectedFiles.length) {
                          return GestureDetector(
                            onTap: _showAddOptions,
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppColors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: AppColors.brandOrange.withValues(alpha: 0.45),
                                  width: 1.5,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(7),
                                    decoration: const BoxDecoration(
                                      color: AppColors.brandOrangeSubtle,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.add_rounded,
                                      color: AppColors.brandOrange,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                    "Add More",
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.brandOrange,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }

                        final file = _selectedFiles[index];
                        final isUploaded = _isUploading && index < _uploadedCount;
                        final isCurrent = _isUploading && index == _uploadedCount;

                        return Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isCurrent
                                  ? AppColors.brandOrange
                                  : (isUploaded
                                      ? AppColors.success
                                      : AppColors.border.withValues(alpha: 0.7)),
                              width: isCurrent ? 2 : 1,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF2D1807).withValues(alpha: 0.05),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(15),
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                Image.file(
                                  File(file.path),
                                  fit: BoxFit.cover,
                                ),
                                Positioned(
                                  top: 6,
                                  left: 6,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.55),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      "#${index + 1}",
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ),
                                if (!_isUploading)
                                  Positioned(
                                    top: 5,
                                    right: 5,
                                    child: GestureDetector(
                                      behavior: HitTestBehavior.opaque,
                                      onTap: () => _removeFile(index),
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withValues(alpha: 0.6),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.close_rounded,
                                          size: 13,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ),
                                if (isUploaded)
                                  Container(
                                    color: AppColors.success.withValues(alpha: 0.35),
                                    child: Center(
                                      child: Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: const BoxDecoration(
                                          color: AppColors.success,
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(
                                          Icons.check_rounded,
                                          size: 16,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  )
                                else if (isCurrent)
                                  Container(
                                    color: Colors.black45,
                                    child: const Center(
                                      child: SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.5,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
          ),

          // Bottom: Progress bar when uploading
          if (_isUploading)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.border.withValues(alpha: 0.65),
                  ),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Uploading $_uploadedCount of ${_selectedFiles.length}...",
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.charcoal,
                          ),
                        ),
                        Text(
                          "${(_uploadProgress * 100).toInt()}%",
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: AppColors.brandOrange,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: _uploadProgress.clamp(0.0, 1.0),
                        minHeight: 6,
                        backgroundColor: AppColors.creamSurface,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.brandOrange),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        Icon(
                          Icons.auto_awesome_rounded,
                          size: 13,
                          color: AppColors.brandOrange,
                        ),
                        SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            "AI face indexing will run automatically",
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          // Bottom Action: 1 full-width clean primary button ("Upload X Photos")
          if (_selectedFiles.isNotEmpty)
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: HeroButton(
                  variant: HeroButtonVariant.solid,
                  size: HeroButtonSize.lg,
                  isFullWidth: true,
                  isLoading: _isUploading,
                  icon: _isUploading
                      ? null
                      : const Icon(Icons.cloud_upload_rounded, size: 20, color: Colors.white),
                  text: _isUploading
                      ? "Uploading..."
                      : "Upload ${_selectedFiles.length} Photo${_selectedFiles.length == 1 ? '' : 's'}",
                  onPressed: _isUploading ? null : _startUpload,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
