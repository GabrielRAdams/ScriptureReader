import AVFoundation

/// Text-to-speech: speaks single words, letter sounds, or a whole verse with
/// per-word "karaoke" highlighting. A shared singleton so the whole app talks
/// through one synthesizer.
final class SpeechService: NSObject, ObservableObject {
    static let shared = SpeechService()

    private let synth = AVSpeechSynthesizer()

    /// The word currently being spoken (drives the highlight in the UI). nil = silent.
    @Published var speakingWordIndex: Int? = nil

    /// Character ranges of each word in the verse currently being read aloud.
    private var wordRanges: [NSRange] = []

    private override init() {
        super.init()
        synth.delegate = self
    }

    // MARK: Public API

    /// Speak one word and highlight it while it plays.
    func speakWord(_ token: WordToken) {
        wordRanges = []
        speakingWordIndex = token.index
        utter(token.clean, rate: 0.40, pitch: 1.12)
    }

    /// Speak the phonic sound of a single letter (slower, no highlight change).
    func speakLetterSound(_ letter: String) {
        wordRanges = []
        utter(Phonics.sound(for: letter), rate: 0.28, pitch: 1.05)
    }

    /// Speak a word slowly, blending its sounds together.
    func blendWord(_ token: WordToken) {
        wordRanges = []
        speakingWordIndex = token.index
        utter(token.clean, rate: 0.22, pitch: 1.05)
    }

    /// Read the whole verse aloud, highlighting each word as it is spoken.
    func speakVerse(_ verse: Verse) {
        wordRanges = SpeechService.computeWordRanges(verse.text)
        utter(verse.text, rate: 0.42, pitch: 1.08)
    }

    func stop() {
        synth.stopSpeaking(at: .immediate)
        speakingWordIndex = nil
    }

    // MARK: Internals

    private func utter(_ text: String, rate: Float, pitch: Float) {
        // Make sure we can play even if the mic just held a .record session.
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, options: [.duckOthers])
        try? session.setActive(true)

        synth.stopSpeaking(at: .immediate)
        let u = AVSpeechUtterance(string: text)
        u.rate = rate
        u.pitchMultiplier = pitch
        u.preUtteranceDelay = 0.02
        u.voice = AVSpeechSynthesisVoice(language: "en-US")
        synth.speak(u)
    }

    /// Ranges of space-separated words — same order/count as `Verse.words`.
    static func computeWordRanges(_ text: String) -> [NSRange] {
        let ns = text as NSString
        var ranges: [NSRange] = []
        var i = 0
        let len = ns.length
        while i < len {
            while i < len && ns.character(at: i) == 32 { i += 1 }   // skip spaces
            guard i < len else { break }
            let start = i
            while i < len && ns.character(at: i) != 32 { i += 1 }
            ranges.append(NSRange(location: start, length: i - start))
        }
        return ranges
    }
}

extension SpeechService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer,
                           willSpeakRangeOfSpeechString characterRange: NSRange,
                           utterance: AVSpeechUtterance) {
        guard !wordRanges.isEmpty else { return }
        if let idx = wordRanges.firstIndex(where: { NSLocationInRange(characterRange.location, $0) }) {
            DispatchQueue.main.async { self.speakingWordIndex = idx }
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.speakingWordIndex = nil }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.speakingWordIndex = nil }
    }
}
