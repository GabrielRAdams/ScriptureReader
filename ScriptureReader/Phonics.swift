import Foundation

/// Approximate phonic (letter-sound) spellings. AVSpeechSynthesizer says the
/// *name* of a letter ("bee") by default; feeding it these spellings gets it
/// closer to the letter's most common *sound* ("buh"). Not IPA-perfect, but
/// usable for early phonics. Easy to swap for recorded audio later.
enum Phonics {
    private static let map: [Character: String] = [
        "a": "aah", "b": "buh", "c": "kuh", "d": "duh", "e": "eh",
        "f": "ffff", "g": "guh", "h": "huh", "i": "ih",  "j": "juh",
        "k": "kuh", "l": "luh", "m": "mmm", "n": "nnn", "o": "aw",
        "p": "puh", "q": "kwuh","r": "rrr", "s": "sss", "t": "tuh",
        "u": "uh",  "v": "vvv", "w": "wuh", "x": "ks",  "y": "yuh",
        "z": "zzz"
    ]

    /// The spoken sound for a single letter.
    static func sound(for letter: String) -> String {
        guard let ch = letter.lowercased().first else { return letter }
        return map[ch] ?? letter
    }
}
