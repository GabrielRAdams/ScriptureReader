import SwiftUI

/// The main reading screen: shows one verse and switches between the three modes.
struct ReaderView: View {
    let verse: Verse

    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var speech = SpeechService.shared
    @StateObject private var recognizer = SpeechRecognizer()

    @State private var mode: ReadingMode = .read
    @State private var soundOutWord: WordToken? = nil

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            VStack(spacing: 14) {
                topBar
                modePicker
                Text(mode.hint)
                    .font(Theme.rounded(15, .semibold))
                    .foregroundStyle(Theme.ink.opacity(0.6))

                ScrollView {
                    FlowLayout(spacing: 10, lineSpacing: 14) {
                        ForEach(verse.words) { word in
                            WordChip(
                                word: word,
                                isSpeaking: speech.speakingWordIndex == word.index,
                                isMatched: mode == .check && recognizer.matchedWordIndices.contains(word.index),
                                isSelected: soundOutWord?.index == word.index
                            )
                            .onTapGesture { tap(word) }
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                }

                Spacer(minLength: 0)
                controls
            }
            .padding(.top, 8)
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .onChange(of: mode) { _, _ in
            speech.stop()
            soundOutWord = nil
            if recognizer.isRecording { recognizer.stop() }
        }
        .onDisappear {
            speech.stop()
            if recognizer.isRecording { recognizer.stop() }
        }
    }

    // MARK: Word taps

    private func tap(_ word: WordToken) {
        switch mode {
        case .read:
            speech.speakWord(word)
        case .soundOut:
            soundOutWord = word
            speech.speakWord(word)
        case .check:
            speech.speakWord(word)   // tapping still helps if they're stuck
        }
    }

    // MARK: Top bar

    private var topBar: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.system(size: 34))
                    .foregroundStyle(Theme.accent)
            }
            Spacer()
            Text(verse.reference)
                .font(Theme.rounded(24, .heavy))
                .foregroundStyle(Theme.ink)
            Spacer()
            // Balance the back button so the title stays centered.
            Image(systemName: "chevron.left.circle.fill")
                .font(.system(size: 34))
                .opacity(0)
        }
        .padding(.horizontal, 18)
    }

    // MARK: Mode picker

    private var modePicker: some View {
        HStack(spacing: 8) {
            ForEach(ReadingMode.allCases) { m in
                Button(action: { mode = m }) {
                    VStack(spacing: 2) {
                        Text(m.emoji).font(.system(size: 22))
                        Text(m.rawValue).font(Theme.rounded(13, .bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(mode == m ? Theme.accent : Theme.card)
                    )
                    .foregroundStyle(mode == m ? .white : Theme.ink.opacity(0.7))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Theme.accentSoft, lineWidth: mode == m ? 0 : 2)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
    }

    // MARK: Bottom controls

    @ViewBuilder private var controls: some View {
        switch mode {
        case .read:
            readControls
        case .soundOut:
            soundOutControls
        case .check:
            checkControls
        }
    }

    private var readControls: some View {
        Button(action: {
            if speech.speakingWordIndex != nil { speech.stop() }
            else { speech.speakVerse(verse) }
        }) {
            Label(speech.speakingWordIndex != nil ? "Stop" : "Read the whole verse",
                  systemImage: speech.speakingWordIndex != nil ? "stop.fill" : "play.fill")
                .font(Theme.rounded(20, .heavy))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(RoundedRectangle(cornerRadius: 22).fill(Theme.accent))
                .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 18)
        .padding(.bottom, 14)
    }

    @ViewBuilder private var soundOutControls: some View {
        if let word = soundOutWord {
            LetterPanel(word: word,
                        onLetter: { speech.speakLetterSound($0) },
                        onBlend: { speech.blendWord(word) },
                        onClose: { soundOutWord = nil })
                .padding(.horizontal, 14)
                .padding(.bottom, 14)
        } else {
            Text("👆 Tap a word to sound it out")
                .font(Theme.rounded(18, .bold))
                .foregroundStyle(Theme.ink.opacity(0.55))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 26)
                .background(RoundedRectangle(cornerRadius: 22).fill(Theme.card))
                .padding(.horizontal, 18)
                .padding(.bottom, 14)
        }
    }

    @ViewBuilder private var checkControls: some View {
        VStack(spacing: 10) {
            if recognizer.permissionDenied {
                Text("Please allow the microphone in Settings to use My Turn.")
                    .font(Theme.rounded(14, .semibold))
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            } else if recognizer.didFinish && !recognizer.isRecording {
                Text("You read \(recognizer.matchedWordIndices.count) of \(verse.wordCount) words! 🎉")
                    .font(Theme.rounded(19, .heavy))
                    .foregroundStyle(Theme.correct)
            }

            Button(action: {
                if recognizer.isRecording { recognizer.stop() }
                else { recognizer.start(target: verse.words.map(\.clean)) }
            }) {
                Label(recognizer.isRecording ? "Stop" : "Read it out loud",
                      systemImage: recognizer.isRecording ? "stop.fill" : "mic.fill")
                    .font(Theme.rounded(20, .heavy))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(RoundedRectangle(cornerRadius: 22)
                        .fill(recognizer.isRecording ? Theme.sky : Theme.accent))
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 14)
    }
}

/// One tappable word.
private struct WordChip: View {
    let word: WordToken
    let isSpeaking: Bool
    let isMatched: Bool
    let isSelected: Bool

    var body: some View {
        Text(word.display)
            .font(Theme.rounded(30, .bold))
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 12).fill(fill))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Theme.accent, lineWidth: isSelected ? 3 : 0)
            )
            .animation(.easeInOut(duration: 0.15), value: isSpeaking)
            .animation(.easeInOut(duration: 0.15), value: isMatched)
    }

    private var fill: Color {
        if isSpeaking { return Theme.speaking }
        if isMatched  { return Theme.correct.opacity(0.55) }
        return .clear
    }
}

/// The sound-it-out panel: big letters + a blend button.
private struct LetterPanel: View {
    let word: WordToken
    let onLetter: (String) -> Void
    let onBlend: () -> Void
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Tap each letter")
                    .font(Theme.rounded(15, .bold))
                    .foregroundStyle(Theme.ink.opacity(0.6))
                Spacer()
                Button(action: onClose) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Theme.ink.opacity(0.3))
                }
            }

            FlowLayout(spacing: 10, lineSpacing: 10) {
                ForEach(Array(word.letters.enumerated()), id: \.offset) { pair in
                    Button(action: { onLetter(pair.element) }) {
                        Text(pair.element.uppercased())
                            .font(Theme.rounded(38, .heavy))
                            .foregroundStyle(Theme.accent)
                            .frame(width: 56, height: 64)
                            .background(RoundedRectangle(cornerRadius: 14).fill(Theme.accentSoft))
                    }
                    .buttonStyle(.plain)
                }
            }

            Button(action: onBlend) {
                Label("Blend it", systemImage: "speaker.wave.2.fill")
                    .font(Theme.rounded(18, .heavy))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(RoundedRectangle(cornerRadius: 18).fill(Theme.sky))
                    .foregroundStyle(.white)
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 22).fill(Theme.card))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.accentSoft, lineWidth: 2))
    }
}
