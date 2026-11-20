import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/hero_components.dart';
import '../../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _verificationCodeController = TextEditingController();
  bool _verificationPending = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  int _selectedTierTab = 0;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _verificationCodeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final authProvider = context.read<AuthProvider>();
    if (_verificationPending) {
      if (!RegExp(r'^\d{6}$').hasMatch(_verificationCodeController.text.trim())) return;
      final verified = await authProvider.verifyEmailCode(_verificationCodeController.text);
      if (mounted && verified) Navigator.pop(context);
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    final success = await authProvider.register(
      _nameController.text.trim(),
      _emailController.text.trim(),
      _passwordController.text,
    );

    if (!mounted) return;
    if (success) {
      if (authProvider.pendingEmailVerification != null) {
        setState(() => _verificationPending = true);
      } else {
        Navigator.pop(context);
      }
    }
  }

  Future<void> _resendCode() async {
    final sent = await context.read<AuthProvider>().resendVerificationCode();
    if (!mounted || !sent) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('A new verification code has been sent.')));
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.creamCanvas,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: Center(
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.border.withValues(alpha: 0.8),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2D1807).withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
                color: AppColors.charcoal,
                padding: EdgeInsets.zero,
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ),
        ),
        title: Text(_verificationPending ? 'Verify Email' : 'Create Account'),
      ),
      body: Stack(
        children: [
          // Background ambient gradient orbs
          Positioned(
            top: -50,
            left: -50,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    AppColors.brandOrange.withValues(alpha: 0.1),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 20,
            right: -60,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    const Color(0xFFF59E0B).withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header Tag & Title
                    Row(
                      children: [
                        const HeroBadge(
                          label: 'PHOTOGRAPHER REGISTRATION',
                          variant: HeroBadgeVariant.flat,
                          color: HeroBadgeColor.primary,
                          icon: Icon(Icons.camera_alt_outlined, size: 13, color: AppColors.brandOrange),
                        ),
                        const Spacer(),
                        HeroBadge(
                          label: _selectedTierTab == 0 ? 'SOLO PRO' : 'STUDIO TEAM',
                          variant: HeroBadgeVariant.dot,
                          color: HeroBadgeColor.success,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Join Chobi Dao',
                      style: Theme.of(context).textTheme.displayMedium?.copyWith(
                            color: AppColors.charcoal,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Deliver event memories with instant AI face indexing.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppColors.textSecondary,
                            fontSize: 14,
                          ),
                    ),
                    const SizedBox(height: 20),

                    // Tier Selection Pill Tabs
                    HeroPillTabs(
                      selectedIndex: _selectedTierTab,
                      onTabSelected: (idx) => setState(() => _selectedTierTab = idx),
                      tabs: const [
                        HeroPillTabItem(
                          label: 'Solo Photographer',
                          icon: Icons.person_rounded,
                        ),
                        HeroPillTabItem(
                          label: 'Studio & Agency',
                          icon: Icons.groups_rounded,
                          badge: 'PRO',
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Luxury Glass Card
                    HeroCard(
                      isBlurred: true,
                      borderRadius: 24,
                      padding: const EdgeInsets.all(22),
                      border: Border.all(
                        color: AppColors.border.withValues(alpha: 0.6),
                        width: 1,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Error Banner
                          if (authProvider.errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              decoration: BoxDecoration(
                                color: AppColors.errorBg,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.error_outline_rounded,
                                    color: AppColors.error,
                                    size: 18,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      authProvider.errorMessage!,
                                      style: const TextStyle(
                                        color: AppColors.error,
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.close_rounded,
                                      size: 16,
                                      color: AppColors.error,
                                    ),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: authProvider.clearError,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 18),
                          ],

                          if (_verificationPending) ...[
                            Text('Check your inbox', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 8),
                            Text('Enter the 6-digit code sent to ${authProvider.pendingEmailVerification ?? _emailController.text}.', style: const TextStyle(color: AppColors.textSecondary, height: 1.5)),
                            const SizedBox(height: 20),
                            TextFormField(
                              controller: _verificationCodeController,
                              keyboardType: TextInputType.number,
                              autofillHints: const [AutofillHints.oneTimeCode],
                              maxLength: 6,
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w700, letterSpacing: 8),
                              decoration: const InputDecoration(labelText: 'Verification code', hintText: '000000', counterText: ''),
                              validator: (value) => RegExp(r'^\d{6}$').hasMatch(value?.trim() ?? '') ? null : 'Enter the 6-digit code',
                              onFieldSubmitted: (_) => _submit(),
                            ),
                            const SizedBox(height: 20),
                            HeroButton(text: 'Verify email', variant: HeroButtonVariant.solid, size: HeroButtonSize.lg, isFullWidth: true, isLoading: authProvider.isLoading, icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white), onPressed: _submit),
                            TextButton(onPressed: authProvider.isLoading ? null : _resendCode, child: const Text('Send a new code')),
                          ] else ...[
                          // Photographer or Studio Name
                          HeroTextField(
                            controller: _nameController,
                            label: _selectedTierTab == 0 ? 'Photographer Name' : 'Studio / Agency Name',
                            hintText: _selectedTierTab == 0 ? 'e.g. Alvy Rahman' : 'e.g. Vintage Lens Studio',
                            textCapitalization: TextCapitalization.words,
                            textInputAction: TextInputAction.next,
                            prefixIcon: Icon(
                              _selectedTierTab == 0 ? Icons.person_outline_rounded : Icons.apartment_rounded,
                              size: 19,
                              color: AppColors.textSecondary,
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Please enter your name or studio name';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Email Address
                          HeroTextField(
                            controller: _emailController,
                            label: 'Email Address',
                            hintText: 'studio@chobidao.com',
                            keyboardType: TextInputType.emailAddress,
                            autofillHints: const [AutofillHints.email],
                            textInputAction: TextInputAction.next,
                            prefixIcon: const Icon(
                              Icons.alternate_email_rounded,
                              size: 19,
                              color: AppColors.textSecondary,
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Please enter your email';
                              }
                              if (!val.contains('@') || !val.contains('.')) {
                                return 'Please enter a valid email address';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Password
                          HeroTextField(
                            controller: _passwordController,
                            label: 'Password',
                            hintText: 'At least 6 characters',
                            obscureText: _obscurePassword,
                            textInputAction: TextInputAction.next,
                            prefixIcon: const Icon(
                              Icons.lock_outline_rounded,
                              size: 19,
                              color: AppColors.textSecondary,
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                                color: AppColors.textSecondary,
                                size: 20,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscurePassword = !_obscurePassword;
                                });
                              },
                            ),
                            validator: (val) {
                              if (val == null || val.isEmpty) {
                                return 'Please enter a password';
                              }
                              if (val.length < 6) {
                                return 'Password must be at least 6 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Confirm Password
                          HeroTextField(
                            controller: _confirmPasswordController,
                            label: 'Confirm Password',
                            hintText: 'Re-enter your password',
                            obscureText: _obscureConfirmPassword,
                            textInputAction: TextInputAction.done,
                            onFieldSubmitted: (_) => _submit(),
                            prefixIcon: const Icon(
                              Icons.lock_reset_rounded,
                              size: 19,
                              color: AppColors.textSecondary,
                            ),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscureConfirmPassword
                                    ? Icons.visibility_off_outlined
                                    : Icons.visibility_outlined,
                                color: AppColors.textSecondary,
                                size: 20,
                              ),
                              onPressed: () {
                                setState(() {
                                  _obscureConfirmPassword = !_obscureConfirmPassword;
                                });
                              },
                            ),
                            validator: (val) {
                              if (val != _passwordController.text) {
                                return 'Passwords do not match';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 24),

                          // Submit Button
                          HeroButton(
                            text: 'Create Photographer Account',
                            variant: HeroButtonVariant.solid,
                            size: HeroButtonSize.lg,
                            isFullWidth: true,
                            isLoading: authProvider.isLoading,
                            icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                            onPressed: _submit,
                          ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Login Link
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Already registered? ',
                          style: TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 13.5,
                          ),
                        ),
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: const Text(
                            'Sign In',
                            style: TextStyle(
                              color: AppColors.brandOrange,
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Feature highlights pill badges
                    const Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        HeroBadge(
                          label: '512D AI FACIAL RECOGNITION',
                          variant: HeroBadgeVariant.dot,
                          color: HeroBadgeColor.primary,
                        ),
                        HeroBadge(
                          label: 'GOOGLE DRIVE SYNC',
                          variant: HeroBadgeVariant.dot,
                          color: HeroBadgeColor.neutral,
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
