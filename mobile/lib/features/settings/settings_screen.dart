import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "package:url_launcher/url_launcher.dart";
import "../../core/api/api_client.dart";
import "../../core/config/app_config.dart";
import "../../core/theme/app_theme.dart";
import "../../core/widgets/hero_components.dart";
import "../../providers/auth_provider.dart";

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _faceDetectionHighQuality = true;
  bool _instantUploadSync = true;
  bool _watermarkEnabled = false;
  int _selectedCategoryTab = 0;

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showServerConfigDialog(BuildContext context) {
    final apiCtrl = TextEditingController(text: ApiClient.defaultBaseUrl);
    final webCtrl = TextEditingController(text: ApiClient.defaultWebBaseUrl);

    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: HeroCard(
          borderRadius: 24,
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.brandOrange.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.dns_rounded, color: AppColors.brandOrange, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "Custom Endpoints",
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: AppColors.charcoal,
                          ),
                        ),
                        Text(
                          "Dynamic API & domain overrides",
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              HeroTextField(
                controller: apiCtrl,
                label: "API Gateway Base URL",
                hintText: "https://api-chobi...",
                prefixIcon: const Icon(Icons.api_rounded, size: 18, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 14),
              HeroTextField(
                controller: webCtrl,
                label: "Web / Guest Portal Base URL",
                hintText: "https://chobi...",
                prefixIcon: const Icon(Icons.public_rounded, size: 18, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: HeroButton(
                      text: "Reset Default",
                      variant: HeroButtonVariant.bordered,
                      size: HeroButtonSize.md,
                      color: AppColors.textSecondary,
                      onPressed: () async {
                        await AppConfig.resetToEnvDefaults();
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          setState(() {});
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text("Reset to default environment URLs."),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: HeroButton(
                      text: "Save & Apply",
                      variant: HeroButtonVariant.solid,
                      size: HeroButtonSize.md,
                      onPressed: () async {
                        await AppConfig.setCustomUrls(
                          apiUrl: apiCtrl.text.trim(),
                          webUrl: webCtrl.text.trim(),
                        );
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (context.mounted) {
                          setState(() {});
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text("Server domains updated successfully!"),
                              backgroundColor: AppColors.success,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24),
        child: HeroCard(
          borderRadius: 24,
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.errorBg,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
                  ),
                  child: const Icon(Icons.logout_rounded, color: AppColors.error, size: 26),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                "Sign Out",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.charcoal,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Are you sure you want to sign out of your photographer account?",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Expanded(
                    child: HeroButton(
                      text: "Cancel",
                      variant: HeroButtonVariant.flat,
                      color: AppColors.charcoalMuted,
                      size: HeroButtonSize.md,
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: HeroButton(
                      text: "Sign Out",
                      variant: HeroButtonVariant.solid,
                      color: AppColors.error,
                      size: HeroButtonSize.md,
                      onPressed: () async {
                        Navigator.pop(ctx);
                        await context.read<AuthProvider>().logout();
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    final showAi = _selectedCategoryTab == 0 || _selectedCategoryTab == 1;
    final showIntegrations = _selectedCategoryTab == 0 || _selectedCategoryTab == 2;
    final showLegal = _selectedCategoryTab == 0 || _selectedCategoryTab == 3;

    return Scaffold(
      backgroundColor: AppColors.creamCanvas,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text("Settings & Studio"),
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 96),
        children: [
          // Profile Header Card (HeroCard with luxury glass styling)
          HeroCard(
            isBlurred: true,
            borderRadius: 24,
            padding: const EdgeInsets.all(20),
            backgroundColor: Colors.white.withValues(alpha: 0.9),
            border: Border.all(
              color: AppColors.border.withValues(alpha: 0.7),
              width: 1,
            ),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.brandOrange, Color(0xFFF59E0B)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.brandOrange.withValues(alpha: 0.35),
                        blurRadius: 14,
                        offset: const Offset(0, 5),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      (user?.name.isNotEmpty == true ? user!.name[0] : "P").toUpperCase(),
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              user?.name ?? "Photographer",
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppColors.charcoal,
                                letterSpacing: -0.3,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const HeroBadge(
                            label: "VERIFIED",
                            variant: HeroBadgeVariant.dot,
                            color: HeroBadgeColor.success,
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        user?.email ?? "studio@chobidao.com",
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      HeroBadge(
                        label: "PLAN: ${(user?.plan ?? "PRO PHOTOGRAPHER").toUpperCase()}",
                        variant: HeroBadgeVariant.solid,
                        color: HeroBadgeColor.primary,
                        icon: const Icon(Icons.workspace_premium_rounded, size: 12, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // Sleek Pill Tabs for Filtering Categories
          HeroPillTabs(
            selectedIndex: _selectedCategoryTab,
            onTabSelected: (idx) => setState(() => _selectedCategoryTab = idx),
            tabs: const [
              HeroPillTabItem(label: "All", icon: Icons.tune_rounded),
              HeroPillTabItem(label: "AI Engine", icon: Icons.psychology_rounded),
              HeroPillTabItem(label: "Cloud Sync", icon: Icons.cloud_done_rounded),
              HeroPillTabItem(label: "Compliance", icon: Icons.shield_outlined),
            ],
          ),

          const SizedBox(height: 20),

          // Section 1: AI Processing Preferences
          if (showAi) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome_rounded, size: 15, color: AppColors.brandOrange),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text(
                      "AI INDEXING PREFERENCES",
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textSecondary,
                        letterSpacing: 1.1,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  HeroBadge(
                    label: _faceDetectionHighQuality ? "PRECISION ACTIVE" : "STANDARD",
                    variant: HeroBadgeVariant.flat,
                    color: _faceDetectionHighQuality ? HeroBadgeColor.primary : HeroBadgeColor.neutral,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            HeroCard(
              borderRadius: 22,
              padding: EdgeInsets.zero,
              border: Border.all(color: AppColors.border.withValues(alpha: 0.65)),
              child: Column(
                children: [
                  SwitchListTile.adaptive(
                    value: _faceDetectionHighQuality,
                    activeThumbColor: AppColors.brandOrange,
                    activeTrackColor: AppColors.brandOrange.withValues(alpha: 0.4),
                    secondary: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.brandOrange.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.face_retouching_natural_rounded, color: AppColors.brandOrange, size: 20),
                    ),
                    title: const Text(
                      "Ultra-Precision Face Search",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    subtitle: const Text(
                      "Extract 512D embeddings for challenging lighting, side angles, and crowd shots",
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    onChanged: (val) => setState(() => _faceDetectionHighQuality = val),
                  ),
                  Divider(height: 1, color: AppColors.border.withValues(alpha: 0.4)),
                  SwitchListTile.adaptive(
                    value: _instantUploadSync,
                    activeThumbColor: AppColors.brandOrange,
                    activeTrackColor: AppColors.brandOrange.withValues(alpha: 0.4),
                    secondary: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.teal.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.sync_rounded, color: Colors.teal, size: 20),
                    ),
                    title: const Text(
                      "Immediate Background Sync",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    subtitle: const Text(
                      "Auto-queue indexing jobs as soon as photos are uploaded via WiFi or hotspot",
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    onChanged: (val) => setState(() => _instantUploadSync = val),
                  ),
                  Divider(height: 1, color: AppColors.border.withValues(alpha: 0.4)),
                  SwitchListTile.adaptive(
                    value: _watermarkEnabled,
                    activeThumbColor: AppColors.brandOrange,
                    activeTrackColor: AppColors.brandOrange.withValues(alpha: 0.4),
                    secondary: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.branding_watermark_rounded, color: Colors.amber, size: 20),
                    ),
                    title: const Text(
                      "Studio Watermark Overlay",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    subtitle: const Text(
                      "Embed subtle studio logo watermark on guest instant preview downloads",
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    onChanged: (val) => setState(() => _watermarkEnabled = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Section 2: Studio Integrations & Cloud
          if (showIntegrations) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
              child: Row(
                children: [
                  const Icon(Icons.cloud_queue_rounded, size: 15, color: AppColors.brandOrange),
                  const SizedBox(width: 6),
                  const Expanded(
                    child: Text(
                      "INTEGRATIONS & CLOUD",
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textSecondary,
                        letterSpacing: 1.1,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  HeroBadge(
                    label: user?.hasDriveConnected == true ? "SYNCED" : "AVAILABLE",
                    variant: HeroBadgeVariant.dot,
                    color: user?.hasDriveConnected == true ? HeroBadgeColor.success : HeroBadgeColor.neutral,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            HeroCard(
              borderRadius: 22,
              padding: EdgeInsets.zero,
              border: Border.all(color: AppColors.border.withValues(alpha: 0.65)),
              child: Column(
                children: [
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.add_to_drive_rounded, color: Colors.blue, size: 20),
                    ),
                    title: const Text(
                      "Google Drive Folder Sync",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    subtitle: Text(
                      user?.hasDriveConnected == true ? "Connected to Google Drive" : "Connect Google Drive to auto-sync shoots",
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Google Drive integration active"),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ),
                  Divider(height: 1, color: AppColors.border.withValues(alpha: 0.4)),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.purple.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.qr_code_2_rounded, color: Colors.purple, size: 20),
                    ),
                    title: const Text(
                      "Default QR Brand Template",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    subtitle: const Text(
                      "Customize printable QR standee frames with your studio logo & colors",
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary),
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("Custom QR templates saved in studio presets"),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                  ),
                  Divider(height: 1, color: AppColors.border.withValues(alpha: 0.4)),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.brandOrange.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.cloud_sync_rounded, color: AppColors.brandOrange, size: 20),
                    ),
                    title: const Text(
                      "Custom Domain & API Server",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    subtitle: Text(
                      "API: ${ApiClient.defaultBaseUrl.replaceAll('https://', '')}",
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.creamSurface,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.edit_rounded, size: 16, color: AppColors.brandOrange),
                    ),
                    onTap: () => _showServerConfigDialog(context),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Section 3: Legal & Support
          if (showLegal) ...[
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
              child: Row(
                children: [
                  Icon(Icons.gavel_rounded, size: 15, color: AppColors.brandOrange),
                  SizedBox(width: 6),
                  Text(
                    "HELP & COMPLIANCE",
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textSecondary,
                      letterSpacing: 1.1,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            HeroCard(
              borderRadius: 22,
              padding: EdgeInsets.zero,
              border: Border.all(color: AppColors.border.withValues(alpha: 0.65)),
              child: Column(
                children: [
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.privacy_tip_outlined, color: Colors.green, size: 20),
                    ),
                    title: const Text(
                      "Ephemeral Privacy Protocol",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    subtitle: const Text(
                      "Guest selfies automatically purged post matching",
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    trailing: const Icon(Icons.open_in_new_rounded, size: 17, color: AppColors.textSecondary),
                    onTap: () => _openUrl("${ApiClient.defaultWebBaseUrl}/privacy"),
                  ),
                  Divider(height: 1, color: AppColors.border.withValues(alpha: 0.4)),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.indigo.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.description_outlined, color: Colors.indigo, size: 20),
                    ),
                    title: const Text(
                      "Terms of Service",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    trailing: const Icon(Icons.open_in_new_rounded, size: 17, color: AppColors.textSecondary),
                    onTap: () => _openUrl("${ApiClient.defaultWebBaseUrl}/terms"),
                  ),
                  Divider(height: 1, color: AppColors.border.withValues(alpha: 0.4)),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.support_agent_rounded, color: Colors.orange, size: 20),
                    ),
                    title: const Text(
                      "Contact Photographer Support",
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.charcoal),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary),
                    onTap: () => _openUrl(ApiClient.defaultWebBaseUrl),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
          ],

          // Sign Out Action Button
          HeroButton(
            text: "Sign Out of Studio",
            variant: HeroButtonVariant.bordered,
            size: HeroButtonSize.lg,
            color: AppColors.error,
            isFullWidth: true,
            icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.error),
            onPressed: () => _showLogoutDialog(context),
          ),

          const SizedBox(height: 24),

          // Build & App Info Tag
          const Center(
            child: HeroBadge(
              label: "CHOBI DAO STUDIO • BUILD 34 (V1.0.0)",
              variant: HeroBadgeVariant.dot,
              color: HeroBadgeColor.neutral,
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
