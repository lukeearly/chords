const fs = require('fs');
const ireal = require('./ireal')
const jazz1400 = ireal.parse_playlist(ireal.strip_url(fs.readFileSync("jazz-1400", "utf8")))
const shade = ireal.parse_tune(ireal.strip_url(fs.readFileSync("shade", "utf8")))
// console.log(jazz1400.tunes.map(t => t.key))
// console.log(shade)
const tune = jazz1400.tunes.find(t => t.title === "Zoltan")

jazz1400.tunes.forEach(tune => {
    if (tune.form.raw.match(/}/))
        console.log(tune)
});

console.log(tune)
tune.form.measures.forEach(measure => {
    let str = measure.left.join(" ") + " "
    measure.chords.forEach(chord => {
        str += chord.join("") + " "
    })
    str += " " + measure.right.join(" ")
    console.log(str)
});
// let transposed = ireal.tranpose(tune, "F")
// transposed.form.measures.forEach(measure => {
//     let str = measure.left.join(" ") + " "
//     measure.chords.forEach(chord => {
//         str += chord.join("") + " "
//     })
//     str += " " + measure.right.join(" ")
//     console.log(str)
// });