import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/token_storage.dart';

class ApiClient {
  static String get defaultBaseUrl => AppConfig.apiBaseUrl;
  static String get defaultWebBaseUrl => AppConfig.webBaseUrl;

  final Dio _dio;
  final Dio _refreshDio;
  final TokenStorage _tokenStorage;
  void Function()? onAuthFailed;

  ApiClient({
    String? baseUrl,
    TokenStorage? tokenStorage,
    Dio? dio,
  })  : _tokenStorage = tokenStorage ?? TokenStorage(),
        _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: baseUrl ?? AppConfig.apiBaseUrl,
                connectTimeout: const Duration(seconds: 20),
                receiveTimeout: const Duration(seconds: 25),
                sendTimeout: const Duration(seconds: 30),
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
              ),
            ),
        _refreshDio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? AppConfig.apiBaseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            headers: {'Accept': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra['retry'] != true) {
            // Attempt token refresh
            final refreshToken = await _tokenStorage.getRefreshToken();
            if (refreshToken != null && refreshToken.isNotEmpty) {
              try {
                final response = await _refreshDio.post(
                  '/v1/auth/refresh',
                  options: Options(
                    headers: {'Authorization': 'Bearer $refreshToken'},
                  ),
                );

                if (response.statusCode == 200 || response.statusCode == 201) {
                  final data = response.data as Map<String, dynamic>;
                  final newAccessToken = data['accessToken'] as String?;
                  final newRefreshToken = data['refreshToken'] as String?;

                  if (newAccessToken != null) {
                    await _tokenStorage.saveTokens(
                      accessToken: newAccessToken,
                      refreshToken: newRefreshToken ?? refreshToken,
                    );

                    // Retry original request with new token
                    final requestOptions = error.requestOptions;
                    requestOptions.extra['retry'] = true;
                    requestOptions.headers['Authorization'] =
                        'Bearer $newAccessToken';

                    final retryResponse = await _dio.fetch(requestOptions);
                    return handler.resolve(retryResponse);
                  }
                }
              } catch (_) {
                // Refresh failed
              }
            }

            // If refresh fails or token is missing
            await _tokenStorage.clearAll();
            onAuthFailed?.call();
          }
          return handler.next(error);
        },
      ),
    );
  }

  Dio get rawDio => _dio;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.get<T>(path, queryParameters: queryParameters, options: options);
  }

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.put<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.patch<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) {
    return _dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
  }

  Future<Response<T>> uploadFile<T>(
    String path, {
    required String filePath,
    required String fieldName,
    Map<String, dynamic>? extraData,
    void Function(int sent, int total)? onSendProgress,
  }) async {
    final fileName = filePath.split('/').last;
    final formData = FormData.fromMap({
      if (extraData != null) ...extraData,
      fieldName: await MultipartFile.fromFile(filePath, filename: fileName),
    });

    return _dio.post<T>(
      path,
      data: formData,
      options: Options(headers: {'Content-Type': 'multipart/form-data'}),
      onSendProgress: onSendProgress,
    );
  }

  Future<Response<dynamic>> uploadDirectPhoto({
    required String eventId,
    required String photoId,
    required List<int> bytes,
    String contentType = 'image/jpeg',
    void Function(int sent, int total)? onSendProgress,
  }) async {
    final path = '/v1/events/$eventId/photos/$photoId/upload-direct';
    return _dio.put(
      path,
      data: Stream.fromIterable([bytes]),
      options: Options(
        headers: {
          'Content-Type': contentType,
          'Content-Length': bytes.length.toString(),
        },
      ),
      onSendProgress: onSendProgress,
    );
  }

  static String extractErrorMessage(dynamic error) {
    if (error is DioException) {
      final responseData = error.response?.data;
      if (responseData is Map<String, dynamic>) {
        if (responseData['message'] != null) {
          final msg = responseData['message'];
          if (msg is List) return msg.join(', ');
          return msg.toString();
        }
        if (responseData['error'] != null) {
          return responseData['error'].toString();
        }
      }
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout) {
        return 'Connection timed out. Please check your network.';
      }
      if (error.type == DioExceptionType.connectionError) {
        return 'Network connection error. Server is unreachable.';
      }
      return error.message ?? 'An unexpected network error occurred.';
    }
    return error.toString();
  }
}
