import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:chobi_dao/core/theme/app_theme.dart';
import 'package:chobi_dao/core/widgets/hero_floating_dock.dart';
import 'package:chobi_dao/features/shell/main_shell_screen.dart';
import 'package:chobi_dao/providers/auth_provider.dart';
import 'package:chobi_dao/providers/event_provider.dart';

void main() {
  testWidgets('MainShellScreen renders IndexedStack tabs and navigates correctly', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(400, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => EventProvider()),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const MainShellScreen(),
        ),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify Tab 0 (Dashboard) is active initially
    expect(find.byType(MainShellScreen), findsOneWidget);
    expect(find.byType(IndexedStack), findsOneWidget);
    expect(find.byType(HeroFloatingDock), findsOneWidget);

    final dockFinder = find.byType(HeroFloatingDock);

    // Tap on Events tab in dock
    await tester.tap(find.descendant(of: dockFinder, matching: find.text('Events')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Tap on Analytics tab in dock
    await tester.tap(find.descendant(of: dockFinder, matching: find.text('Analytics')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Tap on Settings tab in dock
    await tester.tap(find.descendant(of: dockFinder, matching: find.text('Settings')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Tap on Center action button to verify quick actions sheet opens
    await tester.tap(find.descendant(of: dockFinder, matching: find.byIcon(Icons.add_rounded)));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    // Verify modal options are shown
    expect(find.text('Quick Actions'), findsOneWidget);
    expect(find.text('New Event'), findsWidgets);
    expect(find.text('Upload Photos'), findsOneWidget);
    expect(find.text('Scan QR'), findsOneWidget);
  });
}
