import 'package:flutter/foundation.dart';
import '../core/api/api_client.dart';
import '../core/storage/token_storage.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  final ApiClient _apiClient;
  final TokenStorage _tokenStorage;

  User? _user;
  bool _isLoading = false;
  bool _isInitialized = false;
  String? _errorMessage;
  String? _pendingEmailVerification;

  AuthProvider({
    ApiClient? apiClient,
    TokenStorage? tokenStorage,
  })  : _apiClient = apiClient ?? ApiClient(),
        _tokenStorage = tokenStorage ?? TokenStorage() {
    _apiClient.onAuthFailed = () {
      logout();
    };
  }

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;
  bool get isInitialized => _isInitialized;
  String? get errorMessage => _errorMessage;
  String? get pendingEmailVerification => _pendingEmailVerification;

  void clearError() {
    if (_errorMessage != null) {
      _errorMessage = null;
      notifyListeners();
    }
  }

  Future<void> restoreSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _tokenStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        _user = null;
        _isInitialized = true;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Check cached user first for instant display
      final cachedUser = await _tokenStorage.getUser();
      if (cachedUser != null) {
        _user = cachedUser;
      }

      // Validate and refresh profile from backend
      final response = await _apiClient.get('/v1/auth/me');
      if (response.statusCode == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        final photographerData = data['photographer'] as Map<String, dynamic>?;
        if (photographerData != null) {
          _user = User.fromJson(photographerData);
          await _tokenStorage.saveUser(_user!);
        }
      }
    } catch (_) {
      // If restore fails and no cached user, clear tokens
      if (_user == null) {
        await _tokenStorage.clearAll();
      }
    } finally {
      _isLoading = false;
      _isInitialized = true;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.post(
        '/v1/auth/photographer/login',
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final photographerData = (data['photographer'] ?? data['user']) as Map<String, dynamic>;

      _user = User.fromJson(photographerData);
      _pendingEmailVerification = null;
      await _tokenStorage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      await _tokenStorage.saveUser(_user!);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = ApiClient.extractErrorMessage(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyEmailCode(String code) async {
    final email = _pendingEmailVerification;
    if (email == null) return false;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiClient.post(
        '/v1/auth/verify-email',
        data: {'email': email, 'code': code.trim()},
      );
      final data = response.data as Map<String, dynamic>;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final photographerData = (data['photographer'] ?? data['user']) as Map<String, dynamic>;
      _user = User.fromJson(photographerData);
      await _tokenStorage.saveTokens(accessToken: accessToken, refreshToken: refreshToken);
      await _tokenStorage.saveUser(_user!);
      _pendingEmailVerification = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = ApiClient.extractErrorMessage(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> resendVerificationCode() async {
    final email = _pendingEmailVerification;
    if (email == null) return false;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      await _apiClient.post('/v1/auth/resend-verification', data: {'email': email});
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = ApiClient.extractErrorMessage(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register(String name, String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.post(
        '/v1/auth/photographer/signup',
        data: {
          'name': name.trim(),
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      final data = response.data as Map<String, dynamic>;
      if (data['verificationRequired'] == true) {
        _pendingEmailVerification = data['email'] as String? ?? email.trim().toLowerCase();
        _isLoading = false;
        notifyListeners();
        return true;
      }
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final photographerData = (data['photographer'] ?? data['user']) as Map<String, dynamic>;

      _user = User.fromJson(photographerData);
      _pendingEmailVerification = null;
      await _tokenStorage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      await _tokenStorage.saveUser(_user!);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = ApiClient.extractErrorMessage(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _user = null;
    _pendingEmailVerification = null;
    _errorMessage = null;
    await _tokenStorage.clearAll();
    notifyListeners();
  }
}
