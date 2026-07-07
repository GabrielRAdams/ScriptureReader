import SwiftUI

/// Home screen: a friendly list of verses to choose from.
struct ContentView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 16) {
                        header
                        ForEach(Array(ScriptureData.verses.enumerated()), id: \.element.id) { pair in
                            NavigationLink(value: pair.element) {
                                VerseCard(number: pair.offset + 1, verse: pair.element)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 32)
                }
            }
            .navigationDestination(for: Verse.self) { verse in
                ReaderView(verse: verse)
            }
            .toolbar(.hidden, for: .navigationBar)
        }
    }

    private var header: some View {
        VStack(spacing: 4) {
            Text("📖✨")
                .font(.system(size: 44))
            Text("Scripture Kids")
                .font(Theme.rounded(34, .heavy))
                .foregroundStyle(Theme.accent)
            Text("Pick a verse to read")
                .font(Theme.rounded(18, .medium))
                .foregroundStyle(Theme.ink.opacity(0.7))
        }
        .padding(.top, 24)
        .padding(.bottom, 6)
    }
}

private struct VerseCard: View {
    let number: Int
    let verse: Verse

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(Theme.accentSoft)
                Text("\(number)")
                    .font(Theme.rounded(22, .heavy))
                    .foregroundStyle(Theme.accent)
            }
            .frame(width: 46, height: 46)

            VStack(alignment: .leading, spacing: 3) {
                Text(verse.reference)
                    .font(Theme.rounded(21, .bold))
                    .foregroundStyle(Theme.ink)
                Text(verse.text)
                    .font(Theme.rounded(14, .regular))
                    .foregroundStyle(Theme.ink.opacity(0.6))
                    .lineLimit(2)
                Text(difficultyLabel)
                    .font(Theme.rounded(12, .semibold))
                    .foregroundStyle(Theme.sky)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(Theme.accent.opacity(0.5))
        }
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 20).fill(Theme.card))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.accentSoft, lineWidth: 2))
        .shadow(color: .black.opacity(0.05), radius: 6, y: 3)
    }

    private var difficultyLabel: String {
        switch verse.wordCount {
        case ..<6:  return "⭐️ Starter"
        case 6..<12: return "⭐️⭐️ Easy"
        case 12..<20: return "⭐️⭐️⭐️ Growing"
        default:     return "⭐️⭐️⭐️⭐️ Challenge"
        }
    }
}
