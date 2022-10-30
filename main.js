const fs = require('fs');
const ireal = require('./ireal')

const file = process.argv[2]

if (!file) {
    console.log("usage: chords PLAYLIST [TITLE [KEY]] ")
    process.exit()
}

const playlist = ireal.parse_playlist(ireal.strip_url(fs.readFileSync(file, "utf8")))

const title = process.argv[3]
const tunes = title ? playlist.tunes.filter(t => t.title.match(process.argv[3])) : playlist.tunes

const key = process.argv[4]

tunes.forEach(tune => {
    if (tune.form.raw.match(/}/)) {
	const transposed = key ? ireal.transpose(tune, key) : tune
        console.log(transposed)
        transposed.form.measures.forEach(measure => {
            let str = measure.left.join(" ") + " "
            measure.chords.forEach(chord => {
                str += chord.join("") + " "
            })
            str += " " + measure.right.join(" ")
            console.log(str)
        });
    }
});
