import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/material.dart';
import 'package:root_checker_plus/root_checker_plus.dart';

void main() {
  runApp(const CyberSecLabApp());
}

// -------------------------------------------------------------
// CYBER THEME PALETTE & CONSTANTS
// -------------------------------------------------------------
class CyberTheme {
  static const Color background = Color(0xFF080B10);
  static const Color surface = Color(0xFF0F1520);
  static const Color surfaceBorder = Color(0xFF1F2B3E);
  static const Color primaryNeon = Color(0xFF00E5FF); // Electric Cyan
  static const Color successNeon = Color(0xFF00E676); // Terminal Emerald
  static const Color alertNeon = Color(0xFFFF1744);   // Breach Crimson
  static const Color warningNeon = Color(0xFFFFD600); // Audit Yellow
  static const Color textMuted = Color(0xFF78909C);
}

class CyberSecLabApp extends StatelessWidget {
  const CyberSecLabApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CoE CyberSec VAPT Suite',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: CyberTheme.background,
        colorScheme: const ColorScheme.dark(
          primary: CyberTheme.primaryNeon,
          surface: CyberTheme.surface,
          error: CyberTheme.alertNeon,
        ),
      ),
      home: const CyberDashboardScreen(),
    );
  }
}

class CyberDashboardScreen extends StatefulWidget {
  const CyberDashboardScreen({super.key});

  @override
  State<CyberDashboardScreen> createState() => _CyberDashboardScreenState();
}

class _CyberDashboardScreenState extends State<CyberDashboardScreen> {
  int _selectedTabIndex = 0;

  final List<Widget> _modules = const [
    RootIntegrityModule(),
    SslTlsAuditModule(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0,
        backgroundColor: CyberTheme.surface,
        shape: const Border(
          bottom: BorderSide(color: CyberTheme.surfaceBorder, width: 1.5),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: CyberTheme.primaryNeon.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: CyberTheme.primaryNeon, width: 1),
              ),
              child: const Text(
                'COE-CS',
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                  color: CyberTheme.primaryNeon,
                ),
              ),
            ),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'VAPT TESTBED',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                  ),
                ),
                Text(
                  'ENGINE RUNNER: ACTIVE',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: CyberTheme.textMuted,
                    letterSpacing: 1.0,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      body: _modules[_selectedTabIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: CyberTheme.surfaceBorder, width: 1.5),
          ),
        ),
        child: NavigationBar(
          backgroundColor: CyberTheme.surface,
          indicatorColor: CyberTheme.primaryNeon.withValues(alpha: 0.2),
          selectedIndex: _selectedTabIndex,
          onDestinationSelected: (idx) => setState(() => _selectedTabIndex = idx),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.shield_outlined, color: CyberTheme.textMuted),
              selectedIcon: Icon(Icons.shield, color: CyberTheme.primaryNeon),
              label: 'Host Integrity',
            ),
            NavigationDestination(
              icon: Icon(Icons.sync_alt, color: CyberTheme.textMuted),
              selectedIcon: Icon(Icons.enhanced_encryption, color: CyberTheme.primaryNeon),
              label: 'TLS Verification',
            ),
          ],
        ),
      ),
    );
  }
}

// -------------------------------------------------------------
// MODULE 1: HOST INTEGRITY & ROOT DETECTOR
// -------------------------------------------------------------
class RootIntegrityModule extends StatefulWidget {
  const RootIntegrityModule({super.key});

  @override
  State<RootIntegrityModule> createState() => _RootIntegrityModuleState();
}

class _RootIntegrityModuleState extends State<RootIntegrityModule> {
  bool _isAuditing = false;
  bool _isJailbroken = false;
  bool _isDevMode = false;
  bool _hasSuBinary = false;
  String _lastScanTimestamp = 'NEVER';

  @override
  void initState() {
    super.initState();
    _executeSystemAudit();
  }

  Future<void> _executeSystemAudit() async {
    setState(() => _isAuditing = true);

    bool jailbroken = false;
    bool devMode = false;
    bool suBinaryDetected = false;

    try {
      jailbroken = (await RootCheckerPlus.isRootChecker()) ?? false;
      devMode = (await RootCheckerPlus.isDeveloperMode()) ?? false;
    } catch (_) {}

    const suBinaryLocations = [
      '/system/bin/su',
      '/system/xbin/su',
      '/sbin/su',
      '/data/local/xbin/su',
      '/data/local/bin/su',
      '/system/sd/xbin/su',
      '/system/bin/failsafe/su',
      '/data/local/su',
    ];

    for (final binPath in suBinaryLocations) {
      if (File(binPath).existsSync()) {
        suBinaryDetected = true;
        break;
      }
    }

    setState(() {
      _isJailbroken = jailbroken;
      _isDevMode = devMode;
      _hasSuBinary = suBinaryDetected;
      _lastScanTimestamp = DateTime.now().toIso8601String().substring(11, 19);
      _isAuditing = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final bool compromised = _isJailbroken || _hasSuBinary;
    final statusColor = compromised ? CyberTheme.alertNeon : CyberTheme.successNeon;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Top HUD Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: CyberTheme.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: statusColor.withValues(alpha: 0.6), width: 1.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'TELEMETRY // POSTURE',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11,
                      letterSpacing: 1.5,
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'SCAN: $_lastScanTimestamp UTC',
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 10,
                      color: CyberTheme.textMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    compromised ? Icons.warning_amber_rounded : Icons.lock_outline,
                    size: 32,
                    color: statusColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      compromised ? 'DEVICE INTEGRITY BREACHED' : 'ENCLAVE POSTURE NOMINAL',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.1,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Telemetry Vectors List
        Container(
          decoration: BoxDecoration(
            color: CyberTheme.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: CyberTheme.surfaceBorder, width: 1),
          ),
          child: Column(
            children: [
              _buildVectorTile(
                vectorId: 'VEC-01',
                title: 'SU Binary File Enumeration',
                target: '/system/[x]bin, /data/local',
                isTriggered: _hasSuBinary,
              ),
              const Divider(color: CyberTheme.surfaceBorder, height: 1),
              _buildVectorTile(
                vectorId: 'VEC-02',
                title: 'OS Tamper & Native Hooks',
                target: 'Android Subsystem APIs',
                isTriggered: _isJailbroken,
              ),
              const Divider(color: CyberTheme.surfaceBorder, height: 1),
              _buildVectorTile(
                vectorId: 'VEC-03',
                title: 'ADB Debugger Bridge Status',
                target: 'Developer Mode Flag',
                isTriggered: _isDevMode,
                warningOnly: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Action Trigger
        SizedBox(
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: CyberTheme.primaryNeon,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            onPressed: _isAuditing ? null : _executeSystemAudit,
            icon: _isAuditing
                ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
            )
                : const Icon(Icons.radar),
            label: Text(
              _isAuditing ? 'AUDITING REGISTERS...' : 'EXECUTE INTEGRITY AUDIT',
              style: const TextStyle(
                fontFamily: 'monospace',
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVectorTile({
    required String vectorId,
    required String title,
    required String target,
    required bool isTriggered,
    bool warningOnly = false,
  }) {
    Color badgeColor = CyberTheme.successNeon;
    String badgeText = 'PASS';

    if (isTriggered) {
      badgeColor = warningOnly ? CyberTheme.warningNeon : CyberTheme.alertNeon;
      badgeText = warningOnly ? 'WARN' : 'EXPOSED';
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      vectorId,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: CyberTheme.primaryNeon,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  target,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 10,
                    color: CyberTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: badgeColor.withValues(alpha: 0.15),
              border: Border.all(color: badgeColor, width: 1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              badgeText,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: badgeColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// MODULE 2: TLS PINNING & NETWORK AUDIT
// -------------------------------------------------------------
class SslTlsAuditModule extends StatefulWidget {
  const SslTlsAuditModule({super.key});

  @override
  State<SslTlsAuditModule> createState() => _SslTlsAuditModuleState();
}

class _SslTlsAuditModuleState extends State<SslTlsAuditModule> {
  final TextEditingController _urlCtrl =
  TextEditingController(text: 'https://httpbin.org/json');
  final TextEditingController _hashCtrl = TextEditingController(
      text: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF');

  bool _isProcessing = false;
  String _terminalLogs = '>> Terminal ready.\n>> Awaiting transmission target...';
  Color _consoleBorderColor = CyberTheme.surfaceBorder;

  void _log(String line) {
    setState(() {
      _terminalLogs += '\n$line';
    });
  }

  Future<void> _transmitPacket({required bool enforcePinning}) async {
    setState(() {
      _isProcessing = true;
      _terminalLogs = '>> [TRANSMIT] URL: ${_urlCtrl.text.trim()}';
      _terminalLogs += '\n>> [PINNING_ENGINE]: ${enforcePinning ? "ENFORCED" : "BYPASS_MODE"}';
      _consoleBorderColor = CyberTheme.primaryNeon;
    });

    final dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
    ));

    if (enforcePinning) {
      final sanitizedHash = _hashCtrl.text.replaceAll(RegExp(r'[:\s]'), '').toLowerCase();

      (dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
        final client = HttpClient(context: SecurityContext(withTrustedRoots: false));

        client.badCertificateCallback = (X509Certificate cert, String host, int port) {
          final derBytes = cert.der;
          final certSha256 = sha256.convert(derBytes).toString().toLowerCase();

          _log('>> [HANDSHAKE] Remote: $host:$port');
          _log('>> [CERT_SHA256] $certSha256');
          _log('>> [EXPECTED]    $sanitizedHash');

          if (certSha256 == sanitizedHash) {
            _log('>> [VERIFY_OK] Fingerprint cryptographic match verified.');
            return true;
          } else {
            _log('>> [SECURITY_ALERT] Fingerprint mismatch! Proxy/MITM CA detected.');
            return false;
          }
        };
        return client;
      };
    }

    try {
      final res = await dio.get(_urlCtrl.text.trim());
      setState(() {
        _consoleBorderColor = CyberTheme.successNeon;
      });
      _log('>> [HTTP_STATUS] 200 OK');
      _log('>> [STREAM_PAYLOAD] ${jsonEncode(res.data).substring(0, 90)}...');
    } on DioException catch (e) {
      setState(() {
        _consoleBorderColor = CyberTheme.alertNeon;
      });
      _log('>> [FAILURE] Exception thrown: ${e.type}');
      _log('>> [DETAILS] ${e.message}');
      if (e.error is HandshakeException) {
        _log('>> [INTERCEPT_ALERT] HandshakeException caught: Custom proxy CA rejected.');
      } else if (e.error is SocketException) {
        _log('>> [SOCKET_ERROR] Network unreachable or socket refused.');
      }
    } catch (e) {
      setState(() {
        _consoleBorderColor = CyberTheme.alertNeon;
      });
      _log('>> [UNHANDLED_EXCEPTION] $e');
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Input Card
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: CyberTheme.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: CyberTheme.surfaceBorder, width: 1),
          ),
          child: Column(
            children: [
              TextField(
                controller: _urlCtrl,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'TARGET HOST URL',
                  labelStyle: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: CyberTheme.primaryNeon,
                  ),
                  prefixIcon: const Icon(Icons.link, color: CyberTheme.textMuted),
                  enabledBorder: OutlineInputBorder(
                    borderSide: const BorderSide(color: CyberTheme.surfaceBorder),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: const BorderSide(color: CyberTheme.primaryNeon),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _hashCtrl,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                decoration: InputDecoration(
                  labelText: 'PINNED CERTIFICATE (SHA-256)',
                  labelStyle: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: CyberTheme.primaryNeon,
                  ),
                  prefixIcon: const Icon(Icons.fingerprint, color: CyberTheme.textMuted),
                  enabledBorder: OutlineInputBorder(
                    borderSide: const BorderSide(color: CyberTheme.surfaceBorder),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: const BorderSide(color: CyberTheme.primaryNeon),
                    borderRadius: BorderRadius.circular(6),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Action Buttons
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: CyberTheme.textMuted),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                onPressed: _isProcessing ? null : () => _transmitPacket(enforcePinning: false),
                child: const Text(
                  'UNPINNED (BASELINE)',
                  style: TextStyle(fontFamily: 'monospace', fontSize: 11, color: Colors.white),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  backgroundColor: CyberTheme.primaryNeon,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                ),
                onPressed: _isProcessing ? null : () => _transmitPacket(enforcePinning: true),
                child: const Text(
                  'TEST PINNED REQUEST',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Monospace Console Readout
        Container(
          width: double.infinity,
          height: 220,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: _consoleBorderColor, width: 1.5),
          ),
          child: SingleChildScrollView(
            child: SelectableText(
              _terminalLogs,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 11,
                color: CyberTheme.successNeon,
                height: 1.4,
              ),
            ),
          ),
        ),
      ],
    );
  }
}