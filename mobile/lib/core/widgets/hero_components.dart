import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
export 'hero_floating_dock.dart';

enum HeroButtonVariant { solid, bordered, flat, light, shadow }
enum HeroButtonSize { sm, md, lg }
enum HeroBadgeVariant { flat, solid, dot }
enum HeroBadgeColor { primary, success, warning, danger, neutral }

class HeroCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final bool isPressable;
  final bool isBlurred;
  final Color? backgroundColor;
  final Gradient? gradient;
  final Border? border;
  final double borderRadius;
  final List<BoxShadow>? shadows;

  const HeroCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.margin,
    this.onTap,
    this.isPressable = false,
    this.isBlurred = false,
    this.backgroundColor,
    this.gradient,
    this.border,
    this.borderRadius = 22,
    this.shadows,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBorder = border ?? Border.all(color: AppColors.border.withValues(alpha: 0.65), width: 1);
    final effectiveShadows = shadows ?? [
      BoxShadow(
        color: const Color(0xFF2D1807).withValues(alpha: 0.05),
        blurRadius: 20,
        offset: const Offset(0, 6),
        spreadRadius: -2,
      ),
      BoxShadow(
        color: const Color(0xFF2D1807).withValues(alpha: 0.02),
        blurRadius: 6,
        offset: const Offset(0, 2),
      ),
    ];

    Widget innerContent = Padding(
      padding: padding ?? EdgeInsets.zero,
      child: child,
    );

    if (isBlurred) {
      innerContent = BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: innerContent,
      );
    }

    if (isPressable || onTap != null) {
      innerContent = Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          splashColor: gradient != null
              ? Colors.white.withValues(alpha: 0.15)
              : AppColors.brandOrange.withValues(alpha: 0.08),
          highlightColor: gradient != null
              ? Colors.white.withValues(alpha: 0.08)
              : AppColors.brandOrange.withValues(alpha: 0.04),
          child: innerContent,
        ),
      );
    }

    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: gradient != null
            ? null
            : (isBlurred
                ? (backgroundColor ?? Colors.white.withValues(alpha: 0.82))
                : (backgroundColor ?? Colors.white)),
        gradient: gradient,
        borderRadius: BorderRadius.circular(borderRadius),
        border: effectiveBorder,
        boxShadow: effectiveShadows,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: innerContent,
      ),
    );
  }
}

class HeroButton extends StatefulWidget {
  final Widget? child;
  final String? text;
  final Widget? icon;
  final VoidCallback? onPressed;
  final HeroButtonVariant variant;
  final HeroButtonSize size;
  final bool isLoading;
  final bool isFullWidth;
  final Color? color;
  final double? borderRadius;

  const HeroButton({
    super.key,
    this.child,
    this.text,
    this.icon,
    this.onPressed,
    this.variant = HeroButtonVariant.solid,
    this.size = HeroButtonSize.md,
    this.isLoading = false,
    this.isFullWidth = false,
    this.color,
    this.borderRadius,
  });

  @override
  State<HeroButton> createState() => _HeroButtonState();
}

class _HeroButtonState extends State<HeroButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final baseColor = widget.color ?? AppColors.brandOrange;

    double height;
    double fontSize;
    EdgeInsets padding;

    switch (widget.size) {
      case HeroButtonSize.sm:
        height = 36;
        fontSize = 12;
        padding = const EdgeInsets.symmetric(horizontal: 14);
        break;
      case HeroButtonSize.lg:
        height = 54;
        fontSize = 15;
        padding = const EdgeInsets.symmetric(horizontal: 24);
        break;
      case HeroButtonSize.md:
        height = 46;
        fontSize = 13.5;
        padding = const EdgeInsets.symmetric(horizontal: 18);
        break;
    }

    Color bg;
    Color fg;
    Border? border;
    List<BoxShadow>? shadow;

    switch (widget.variant) {
      case HeroButtonVariant.solid:
        bg = baseColor;
        fg = Colors.white;
        shadow = [
          BoxShadow(
            color: baseColor.withValues(alpha: _isPressed ? 0.2 : 0.35),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ];
        break;
      case HeroButtonVariant.bordered:
        bg = Colors.transparent;
        fg = baseColor;
        border = Border.all(color: baseColor.withValues(alpha: 0.6), width: 1.5);
        break;
      case HeroButtonVariant.flat:
        bg = baseColor.withValues(alpha: 0.12);
        fg = baseColor;
        break;
      case HeroButtonVariant.light:
        bg = Colors.transparent;
        fg = baseColor;
        break;
      case HeroButtonVariant.shadow:
        bg = baseColor;
        fg = Colors.white;
        shadow = [
          BoxShadow(
            color: baseColor.withValues(alpha: 0.45),
            blurRadius: 22,
            offset: const Offset(0, 8),
          ),
        ];
        break;
    }

    Widget content;
    if (widget.isLoading) {
      content = SizedBox(
        width: 18,
        height: 18,
        child: CircularProgressIndicator(
          strokeWidth: 2.2,
          color: fg,
        ),
      );
    } else {
      List<Widget> rowItems = [];
      if (widget.icon != null) {
        rowItems.add(widget.icon!);
        if (widget.text != null || widget.child != null) {
          rowItems.add(const SizedBox(width: 8));
        }
      }
      if (widget.text != null) {
        rowItems.add(
          Text(
            widget.text!,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              color: fg,
              letterSpacing: -0.2,
            ),
          ),
        );
      } else if (widget.child != null) {
        rowItems.add(widget.child!);
      }
      content = Row(
        mainAxisSize: widget.isFullWidth ? MainAxisSize.max : MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: rowItems,
      );
    }

    final isEnabled = widget.isLoading || widget.onPressed != null;
    final btn = Opacity(
      opacity: isEnabled ? 1.0 : 0.45,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        height: height,
        padding: padding,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(widget.borderRadius ?? (height / 2)),
          border: border,
          boxShadow: isEnabled ? shadow : null,
        ),
        child: Center(child: content),
      ),
    );

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.isLoading ? null : widget.onPressed,
      child: widget.isFullWidth ? SizedBox(width: double.infinity, child: btn) : btn,
    );
  }
}

class HeroBadge extends StatelessWidget {
  final String label;
  final HeroBadgeVariant variant;
  final HeroBadgeColor color;
  final Widget? icon;

  const HeroBadge({
    super.key,
    required this.label,
    this.variant = HeroBadgeVariant.flat,
    this.color = HeroBadgeColor.primary,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    Color primaryColor;
    switch (color) {
      case HeroBadgeColor.primary:
        primaryColor = AppColors.brandOrange;
        break;
      case HeroBadgeColor.success:
        primaryColor = AppColors.success;
        break;
      case HeroBadgeColor.warning:
        primaryColor = AppColors.warning;
        break;
      case HeroBadgeColor.danger:
        primaryColor = AppColors.error;
        break;
      case HeroBadgeColor.neutral:
        primaryColor = AppColors.charcoalMuted;
        break;
    }

    Color bg;
    Color fg;
    Border? border;

    switch (variant) {
      case HeroBadgeVariant.solid:
        bg = primaryColor;
        fg = Colors.white;
        break;
      case HeroBadgeVariant.dot:
        bg = Colors.white;
        fg = primaryColor;
        border = Border.all(color: primaryColor.withValues(alpha: 0.3));
        break;
      case HeroBadgeVariant.flat:
        bg = primaryColor.withValues(alpha: 0.12);
        fg = primaryColor;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: border,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (variant == HeroBadgeVariant.dot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: primaryColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ],
          if (icon != null) ...[
            icon!,
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: fg,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

class HeroPillTabItem {
  final String label;
  final IconData? icon;
  final String? badge;

  const HeroPillTabItem({
    required this.label,
    this.icon,
    this.badge,
  });
}

class HeroPillTabs extends StatelessWidget {
  final List<HeroPillTabItem> tabs;
  final int selectedIndex;
  final ValueChanged<int> onTabSelected;
  final Color? activeColor;
  final Color? activeTextColor;
  final Color? inactiveTextColor;
  final Color? backgroundColor;
  final double height;
  final double borderRadius;

  const HeroPillTabs({
    super.key,
    required this.tabs,
    required this.selectedIndex,
    required this.onTabSelected,
    this.activeColor,
    this.activeTextColor,
    this.inactiveTextColor,
    this.backgroundColor,
    this.height = 46,
    this.borderRadius = 24,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBg = backgroundColor ?? AppColors.creamSurface.withValues(alpha: 0.6);
    final effectiveActiveColor = activeColor ?? Colors.white;
    final effectiveActiveText = activeTextColor ?? AppColors.charcoal;
    final effectiveInactiveText = inactiveTextColor ?? AppColors.textSecondary;

    return Container(
      height: height,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: effectiveBg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: AppColors.border.withValues(alpha: 0.5),
          width: 1,
        ),
      ),
      child: Row(
        children: List.generate(tabs.length, (index) {
          final isSelected = index == selectedIndex;
          final tab = tabs[index];

          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onTabSelected(index),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                decoration: BoxDecoration(
                  color: isSelected ? effectiveActiveColor : Colors.transparent,
                  borderRadius: BorderRadius.circular(borderRadius - 4),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: const Color(0xFF2D1807).withValues(alpha: 0.08),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                          BoxShadow(
                            color: const Color(0xFF2D1807).withValues(alpha: 0.04),
                            blurRadius: 3,
                            offset: const Offset(0, 1),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (tab.icon != null) ...[
                            Icon(
                              tab.icon,
                              size: 15,
                              color: isSelected ? effectiveActiveText : effectiveInactiveText,
                            ),
                            const SizedBox(width: 5),
                          ],
                          Text(
                            tab.label,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                              color: isSelected ? effectiveActiveText : effectiveInactiveText,
                              letterSpacing: -0.2,
                            ),
                          ),
                          if (tab.badge != null) ...[
                            const SizedBox(width: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.brandOrange.withValues(alpha: 0.15)
                                    : AppColors.borderLight,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                tab.badge!,
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? AppColors.brandOrange : AppColors.textTertiary,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class HeroTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hintText;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final FormFieldValidator<String>? validator;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final TextCapitalization textCapitalization;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onFieldSubmitted;
  final FocusNode? focusNode;
  final bool enabled;
  final bool readOnly;
  final int maxLines;
  final VoidCallback? onTap;

  const HeroTextField({
    super.key,
    this.controller,
    this.label,
    this.hintText,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.validator,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.textCapitalization = TextCapitalization.none,
    this.onChanged,
    this.onFieldSubmitted,
    this.focusNode,
    this.enabled = true,
    this.readOnly = false,
    this.maxLines = 1,
    this.onTap,
  });

  @override
  State<HeroTextField> createState() => _HeroTextFieldState();
}

class _HeroTextFieldState extends State<HeroTextField> {
  late FocusNode _focusNode;
  bool _isFocused = false;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    _focusNode = widget.focusNode ?? FocusNode();
    _focusNode.addListener(_handleFocusChange);
  }

  void _handleFocusChange() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
  }

  @override
  void dispose() {
    if (widget.focusNode == null) {
      _focusNode.removeListener(_handleFocusChange);
      _focusNode.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final hasError = _errorText != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.label != null) ...[
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(
              widget.label!,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: AppColors.charcoal,
                letterSpacing: -0.2,
              ),
            ),
          ),
        ],
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          decoration: BoxDecoration(
            color: widget.enabled ? Colors.white : AppColors.creamSurface.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: hasError
                  ? AppColors.error
                  : (_isFocused ? AppColors.brandOrange : AppColors.border.withValues(alpha: 0.7)),
              width: _isFocused ? 1.6 : 1.0,
            ),
            boxShadow: _isFocused
                ? [
                    BoxShadow(
                      color: (hasError ? AppColors.error : AppColors.brandOrange).withValues(alpha: 0.16),
                      blurRadius: 12,
                      offset: const Offset(0, 3),
                      spreadRadius: 1,
                    ),
                  ]
                : [
                    BoxShadow(
                      color: const Color(0xFF2D1807).withValues(alpha: 0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          child: TextFormField(
            controller: widget.controller,
            focusNode: _focusNode,
            obscureText: widget.obscureText,
            keyboardType: widget.keyboardType,
            textInputAction: widget.textInputAction,
            autofillHints: widget.autofillHints,
            textCapitalization: widget.textCapitalization,
            enabled: widget.enabled,
            readOnly: widget.readOnly,
            maxLines: widget.maxLines,
            onTap: widget.onTap,
            onChanged: (val) {
              if (_errorText != null) {
                setState(() => _errorText = null);
              }
              widget.onChanged?.call(val);
            },
            onFieldSubmitted: widget.onFieldSubmitted,
            validator: (val) {
              final err = widget.validator?.call(val);
              setState(() => _errorText = err);
              return err;
            },
            style: const TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w500,
              color: AppColors.charcoal,
            ),
            decoration: InputDecoration(
              isDense: true,
              hintText: widget.hintText,
              hintStyle: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w400,
                color: AppColors.textTertiary.withValues(alpha: 0.8),
              ),
              prefixIcon: widget.prefixIcon != null
                  ? Padding(
                      padding: const EdgeInsets.only(left: 14, right: 10),
                      child: widget.prefixIcon,
                    )
                  : null,
              prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              suffixIcon: widget.suffixIcon != null
                  ? Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: widget.suffixIcon,
                    )
                  : null,
              suffixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              errorStyle: const TextStyle(height: 0, fontSize: 0),
            ),
          ),
        ),
        if (hasError) ...[
          Padding(
            padding: const EdgeInsets.only(left: 8, top: 6),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded, size: 13, color: AppColors.error),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    _errorText!,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

