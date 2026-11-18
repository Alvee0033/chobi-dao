import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  static const String _envApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api-chobi.203.96.190.78.sslip.io',
  );

  static const String _envWebBaseUrl = String.fromEnvironment(
    'WEB_BASE_URL',
    defaultValue: 'https://chobidao.jantrasoft.online',
  );

  static String _apiBaseUrl = _envApiBaseUrl;
  static String _webBaseUrl = _envWebBaseUrl;

  static String get apiBaseUrl => _apiBaseUrl;
  static String get webBaseUrl => _webBaseUrl;

  static const String _spKeyApiUrl = 'chobi_custom_api_url';
  static const String _spKeyWebUrl = 'chobi_custom_web_url';

  static Future<void> initialize() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final customApi = sp.getString(_spKeyApiUrl);
      final customWeb = sp.getString(_spKeyWebUrl);

      if (customApi != null && customApi.trim().isNotEmpty) {
        _apiBaseUrl = customApi.trim();
      }
      if (customWeb != null && customWeb.trim().isNotEmpty) {
        _webBaseUrl = customWeb.trim();
      }
    } catch (_) {
      // Fallback to compile-time env variables
    }
  }

  static Future<void> setCustomUrls({String? apiUrl, String? webUrl}) async {
    final sp = await SharedPreferences.getInstance();
    if (apiUrl != null && apiUrl.trim().isNotEmpty) {
      _apiBaseUrl = apiUrl.trim();
      await sp.setString(_spKeyApiUrl, _apiBaseUrl);
    }
    if (webUrl != null && webUrl.trim().isNotEmpty) {
      _webBaseUrl = webUrl.trim();
      await sp.setString(_spKeyWebUrl, _webBaseUrl);
    }
  }

  static Future<void> resetToEnvDefaults() async {
    final sp = await SharedPreferences.getInstance();
    await sp.remove(_spKeyApiUrl);
    await sp.remove(_spKeyWebUrl);
    _apiBaseUrl = _envApiBaseUrl;
    _webBaseUrl = _envWebBaseUrl;
  }
}
