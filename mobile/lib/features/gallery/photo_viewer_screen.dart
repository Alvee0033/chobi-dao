import "package:cached_network_image/cached_network_image.dart";
import "package:flutter/material.dart";
import "package:share_plus/share_plus.dart";
import "package:url_launcher/url_launcher.dart";
import "../../core/theme/app_theme.dart";
import "../../models/photo.dart";

class PhotoViewerScreen extends StatelessWidget {
  final EventPhoto photo;
  final String eventName;

  const PhotoViewerScreen({
    super.key,
    required this.photo,
    required this.eventName,
  });

  Future<void> _downloadOrOpen(BuildContext context) async {
    final uri = Uri.parse(photo.url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Cannot open high-res photo link")),
        );
      }
    }
  }

  void _sharePhoto() {
    SharePlus.instance.share(ShareParams(text: "Found my photo from $eventName: ${photo.url}"));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          photo.originalFilename ?? "High-Res Photo",
          style: const TextStyle(fontSize: 16),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_rounded),
            onPressed: _sharePhoto,
          ),
          IconButton(
            icon: const Icon(Icons.download_rounded),
            onPressed: () => _downloadOrOpen(context),
          ),
        ],
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.8,
          maxScale: 4.0,
          child: Hero(
            tag: "photo_${photo.id}",
            child: CachedNetworkImage(
              imageUrl: photo.url,
              fit: BoxFit.contain,
              placeholder: (context, url) => const Center(
                child: CircularProgressIndicator(color: AppColors.brandOrange),
              ),
              errorWidget: (context, url, error) => const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.broken_image_rounded, color: Colors.white38, size: 48),
                    SizedBox(height: 8),
                    Text(
                      "Unable to preview full image",
                      style: TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: Container(
        color: Colors.black,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.brandOrange,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      "${photo.faceCount} face(s) identified",
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      photo.status.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: () => _downloadOrOpen(context),
                icon: const Icon(Icons.open_in_browser_rounded, size: 16),
                label: const Text("Full Res"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.brandOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  minimumSize: Size.zero,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
