import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:chobi_dao/core/widgets/hero_floating_dock.dart';

void main() {
  testWidgets('HeroFloatingDock renders all tabs and center action button', (WidgetTester tester) async {
    int selectedIndex = 0;
    bool actionTriggered = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: HeroFloatingDock(
              currentIndex: selectedIndex,
              onIndexChanged: (index) {
                selectedIndex = index;
              },
              onActionPressed: () {
                actionTriggered = true;
              },
            ),
          ),
        ),
      ),
    );

    // Verify items exist
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Events'), findsOneWidget);
    expect(find.text('Insights'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
    expect(find.byIcon(Icons.add_rounded), findsOneWidget);

    // Tap on Events (index 1)
    await tester.tap(find.text('Events'));
    await tester.pumpAndSettle();
    expect(selectedIndex, 1);

    // Tap on Center Action Button
    await tester.tap(find.byIcon(Icons.add_rounded));
    await tester.pumpAndSettle();
    expect(actionTriggered, isTrue);
  });

  testWidgets('HeroFloatingDock renders gracefully on narrow 344dp screen (Fold 4)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(344, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: HeroFloatingDock(
            currentIndex: 0,
            onIndexChanged: (_) {},
          ),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify no render overflow errors
    expect(tester.takeException(), isNull);
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Events'), findsOneWidget);
  });
}
