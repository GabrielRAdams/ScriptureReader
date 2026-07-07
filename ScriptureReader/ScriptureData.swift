import Foundation

/// Ten well-known New Testament verses (KJV — public domain), ordered from
/// easiest (fewest words) to hardest so a child can grow into them.
enum ScriptureData {
    static let verses: [Verse] = [
        Verse(id: 1,
              reference: "John 11:35",
              text: "Jesus wept."),

        Verse(id: 2,
              reference: "1 John 4:19",
              text: "We love him, because he first loved us."),

        Verse(id: 3,
              reference: "Luke 6:31",
              text: "And as ye would that men should do to you, do ye also to them likewise."),

        Verse(id: 4,
              reference: "Philippians 4:13",
              text: "I can do all things through Christ which strengtheneth me."),

        Verse(id: 5,
              reference: "Colossians 3:20",
              text: "Children, obey your parents in all things: for this is well pleasing unto the Lord."),

        Verse(id: 6,
              reference: "Matthew 5:9",
              text: "Blessed are the peacemakers: for they shall be called the children of God."),

        Verse(id: 7,
              reference: "1 Thessalonians 5:18",
              text: "In every thing give thanks: for this is the will of God in Christ Jesus concerning you."),

        Verse(id: 8,
              reference: "Ephesians 4:32",
              text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you."),

        Verse(id: 9,
              reference: "John 13:34",
              text: "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another."),

        Verse(id: 10,
              reference: "John 3:16",
              text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."),
    ]
}
