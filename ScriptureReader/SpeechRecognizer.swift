import Foundation
import Speech
import AVFoundation

/// Listens to the child reading a verse aloud and reports which words they got.
/// Matching is forgiving and in-order so a young reader isn't punished for
/// small slips, skips, or repeats.
@MainActor
final class SpeechRecognizer: ObservableObject {
    @Published var isRecording = false
    @Published var transcript = ""
    @Published var matchedWordIndices: Set<Int> = []
    @Published var permissionDenied = false
    @Published var didFinish = false

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?

    /// Clean target words, in order — index aligns with `Verse.words`.
    private var targetWords: [String] = []

    // MARK: Control

    func start(target: [String]) {
        guard !isRecording else { return }
        targetWords = target
        transcript = ""
        matchedWordIndices = []
        didFinish = false
        permissionDenied = false

        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            guard let self else { return }
            guard status == .authorized else {
                Task { @MainActor in self.permissionDenied = true }
                return
            }
            AVAudioApplication.requestRecordPermission { granted in
                Task { @MainActor in
                    guard granted else { self.permissionDenied = true; return }
                    self.beginSession()
                }
            }
        }
    }

    func stop() {
        guard isRecording else { return }
        engine.stop()
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        isRecording = false
        didFinish = true
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: Session

    private func beginSession() {
        guard let recognizer, recognizer.isAvailable else { permissionDenied = true; return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: .duckOthers)
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            req.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
            request = req

            let node = engine.inputNode
            let format = node.outputFormat(forBus: 0)
            node.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
                self?.request?.append(buffer)
            }
            engine.prepare()
            try engine.start()
            isRecording = true

            task = recognizer.recognitionTask(with: req) { [weak self] result, error in
                guard let self else { return }
                if let result {
                    Task { @MainActor in
                        self.transcript = result.bestTranscription.formattedString
                        self.updateMatches(self.transcript)
                    }
                }
                if error != nil || (result?.isFinal ?? false) {
                    Task { @MainActor in self.stop() }
                }
            }
        } catch {
            isRecording = false
            permissionDenied = true
        }
    }

    // MARK: Matching

    private func updateMatches(_ transcript: String) {
        let spoken = transcript
            .lowercased()
            .split { !$0.isLetter && $0 != "'" }
            .map(String.init)

        var matched = Set<Int>()
        var cursor = 0
        for word in spoken {
            var k = cursor
            while k < targetWords.count && k < cursor + 4 {   // small look-ahead window
                if fuzzyEqual(word, targetWords[k]) {
                    matched.insert(k)
                    cursor = k + 1
                    break
                }
                k += 1
            }
        }
        matchedWordIndices = matched
    }

    private func fuzzyEqual(_ a: String, _ b: String) -> Bool {
        if a == b { return true }
        if a.count >= 3 && b.count >= 3 && (a.hasPrefix(b) || b.hasPrefix(a)) { return true }
        return max(a.count, b.count) >= 3 && levenshtein(a, b) <= 1
    }

    private func levenshtein(_ a: String, _ b: String) -> Int {
        let s = Array(a), t = Array(b)
        if s.isEmpty { return t.count }
        if t.isEmpty { return s.count }
        var prev = Array(0...t.count)
        var curr = [Int](repeating: 0, count: t.count + 1)
        for i in 1...s.count {
            curr[0] = i
            for j in 1...t.count {
                let cost = s[i - 1] == t[j - 1] ? 0 : 1
                curr[j] = min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
            }
            swap(&prev, &curr)
        }
        return prev[t.count]
    }
}
