const magic = "1r34LbKcu7"

exports.strip_url = function(encoded) {
    let url = decodeURIComponent(encoded)
    if (url.startsWith("irealb://")) {
        url = url.slice(9)
    }
    return url
}

exports.parse_playlist = function(decoded) {
    const items = decoded.split("===")
    const playlist = {
        title: items[items.length - 1],
        tunes: items.slice(0, items.length - 1).map(exports.parse_tune)
    }
    return playlist
}

function deobfuscate(original) {
    let obf = original

    // https://github.com/drs251/pyRealParser/blob/28137baa39266499b3b54fb38d9d783372729a18/pyRealParser/pyRealParser.py#L54
    let deobf = ""
    while (obf.length > 50) {
        temp = obf.slice(0, 50)
        obf = obf.slice(50)
        if (obf.length < 2) {
            deobf += temp
        } else {
            result = Array.from(temp)
            for (let i = 0; i < 5; ++i) {
                result[i] = temp[49 - i]
                result[49 - i] = temp[i]
            }
            for (let i = 10; i < 24; ++i) {
                result[i] = temp[49 - i]
                result[49 - i] = temp[i]
            }
            deobf += result.join("")
        }
    }
    deobf += obf
    return deobf
}

const chord_regex = /^([xABCDEFG][b#]?)(5|2|add9|\+|o|h|sus|\^|-|\^7|-7|7|7sus|h7|o7|\^9|\^13|6|69|\^7#11|\^9#11|\^7#5|-6|-69|-\^7|-\^9|-9|-11|-7b5|h9|-b6|-#5|9|7b9|7#9|7#11|7b5|7#5|9#11|9b5|9#5|7b13|7#9#5|7#9b5|7#9#11|7b9#11|7b9b5|7b9#5|7b9#9|7b9b13|7alt|13|13#11|13b9|13#9|7b9sus|7susadd3|9sus|13sus|7b13sus|11)?(\/[ABCDEFG][b#]?)?($|[^as#b1-9])/
// console.log("C7sus/F".match(chord_regex))

function expand_form(raw) {
    let time = [4, 4]
    let form = {
        raw: raw,
        measures: []
    }

    let bar = []
    for (let i = 0; i < raw.length; ++i) {
        const c = raw[i]
        let chord = null
        if (c == "T") {
            bar.push(raw.slice(i, i+3))
            i += 2
            if (i < raw.length - 1) continue // to process final bar line
        } else if (c.match(/[|\[\]{}ZSQfY]/)) {
            bar.push(c)
            if (i < raw.length - 1) continue
        } else if (c == "*") {
            bar.push(raw.slice(i, i + 2))
            i += 1
            if (i < raw.length - 1) continue
        } else if (c == "<") {
            const j = i + raw.slice(i).indexOf(">")
            bar.push(raw.slice(i, j + 1))
            i = j
            if (i < raw.length - 1) continue
        }
        if (bar.length != 0) {
            let next = { left: [], right: [], chords: [] }
            let seen = false
            for (let j = 0; j < bar.length; ++j) {
                const d = bar[j]
                if (d.match(/^[\[\]{}|Z]/)) {
                    seen = true
                }
                if (d.match(/^[Qf]/)) {
                    if (seen || form.measures.length == 0) {
                        next.left.push(d)
                    } else {
                        form.measures[form.measures.length - 1].right.push(d)
                    }
                }
                if (d.match(/^[\[{|TSY]/)) {
                    next.left.push(d)
                }
                if (form.measures.length > 0 && d.match(/^[\]}|Zr]/)) {
                    form.measures[form.measures.length - 1].right.push(d)
                }
            }
            form.measures.push(next)
            bar = []
        }

        if (i < raw.length - 1 && (chord = raw.slice(i).match(chord_regex))) {
            let j = i + chord[0].length
            if (form.measures.length > 0) {
                form.measures[form.measures.length - 1].chords.push(chord.slice(1, 4))
            }
            i = j - 2
        }
    }

    return form
}

exports.parse_tune = function(decoded) {
    const parts = decoded.split("=")

    const obf = parts[6].split(magic)[1]

    let deobf = deobfuscate(obf).trim()
                    .replaceAll("LZ", "|") // not sure the distinction is between LZ or K and |
                    .replaceAll("K", "|")
                    .replaceAll("cl", "x") // ???
                    .replaceAll("XyQ", " ") // why

    const form = expand_form(deobf)

    const tune = {
        title: parts[0],
        composer: parts[1],
        style: parts[3],
        originalKey: parts[4],
        key: parts[4],
        form: form
    }
    // console.log(deobf)
    return tune
}

const ctones = "CDEFGAB"
const semitones = ["C", "C#|Db", "D", "D#|Eb", "E", "F", "F#|Gb", "G", "G#|Ab", "A", "A#|Bb", "B"]
const enharmonic_simp = {
    "Cb": "B",
    "B#": "C",
    "Fb": "E",
    "E#": "F"
}
const interval_sort = ["P", "M", "M", "P", "P", "M", "M"]
const default_semis = [0, 2, 4, 5, 7, 9, 11]

function find_interval(from, to) {
    const a = from[0]
    const b = to[0]
    let j
    let i
    for (i = 0, j = -1; i < ctones.length * 2; ++i) {
        if (ctones[i % ctones.length] == a) j = i
        if (j != -1 && ctones[i % ctones.length] == b) break
    }
    const size = i - j + 1

    for (i = 0, j = -1; i < semitones.length * 2; ++i) {
        if (from.match("^"+semitones[i % semitones.length]+"$")) j = i
        if (j != -1 && to.match("^"+semitones[i % semitones.length]+"$")) break
    }
    const semi = i - j
    const alteration = semi - default_semis[size - 1]
    let quality;
    if (interval_sort[size - 1] == "P") {
        quality = "OoP+U"[alteration + 2]
    } else {
        quality = "omM+U"[alteration + 2]
    }
    // console.log(quality)
    return quality + size
}

function add_interval(from, interval) {
    const quality = interval[0]
    const size = parseInt(interval[1])
    let alteration;
    if (interval_sort[size - 1] == "P") {
        alteration = "OoP+U".indexOf(quality) - 2
    } else {
        alteration = "omM+U".indexOf(quality) - 2
    }
    // console.log(from, interval)
    const semis = default_semis[size - 1] + alteration;

    const j = semitones.findIndex(t => from.match("^"+t+"$")) + semis
    const correct_tone = semitones[j % semitones.length].split('|')
    if (correct_tone.length == 1) return correct_tone[0]

    const i = ctones.indexOf(from[0]) + size - 1
    const correct_name = ctones[i % ctones.length]
    if (parseInt(find_interval(correct_name, correct_tone[0])[1]) < 5) {
        return correct_tone[0]
    } else {
        return correct_tone[1]
    }
}

exports.transpose_note = function(from, to, note) {
    const interval = find_interval(from, note)
    return add_interval(to, interval)
}

exports.transpose = function(tune, to) {
    const from = tune.key.split('-')[0]
    let transposed = JSON.parse(JSON.stringify(tune))
    transposed.key = to.split('-')[0] + (tune.key.includes("-") ? "-" : "")
    transposed.form.measures.forEach(measure => {
        for (let i = 0; i < measure.chords.length; ++i) {
            if (measure.chords[i][0] == "x") continue
            measure.chords[i][0] = exports.transpose_note(from, to, measure.chords[i][0])
            if (measure.chords[i][2]) {
                measure.chords[i][2] = "/" + exports.transpose_note(from, to, measure.chords[i][2].slice(1))
            }
        }
    })
    return transposed
}
