"use strict";
var gulp = require("gulp");
var replace = require("gulp-batch-replace");

///////////////////////////////////////////////////////////////////
// Элементам, которым надо будет удалить классы, В КОНЦЕ подписываем класс inl
///////////////////////////////////////////////////////////////////
var clearClasses = [[new RegExp(' class="(.*?) inl"', "g"), ""]];

///////////////////////////////////////////////////////////////////
//  Переменные для реплейса - в МЯСО ВСЁ!!!!
///////////////////////////////////////////////////////////////////

var preInlineReplaces = [
    // Меняем некоторые тэги - легаси со старого проекта, но принцип можно будет использовать
    // [
    //     "<h2>",
    //     '<table class="h2"><tr>\n<td class="h2__edge"><div class="h2__pseudo-border">&nbsp;</div>\n</td>\n<td class="h2__text"><b>',
    // ],
    // [
    //     "</h2>",
    //     '</b>\n</td>\n<td class="h2__edge"><div class="h2__pseudo-border">&nbsp;</div>\n</td></tr></table>',
    // ],

    // Добавляем нужные атрибуты тэгам
    ["<a ", '<a target="_blank" '],
    ["<img ", '<img border="0" '],
    ["<table", '\n<table cellpadding="0" cellspacing="0" border="0"'],

    // Переносы строк - без них иногда глючит
    // Временно закомментировано

    // ["<td", "\n<td"],
    // ["<tr", "\n<tr"],
    // ["<a", "\n<a"],
    // ["<img", "\n<img"],
    // ["<h", "\n<h"],
];

// Переписать на регулярку
var msoSafe = [
    ["<!-- [", "<!--["],
    ["] -->", "]-->"],
];

// Меняем стили на аттрибуты
var stylesToAttrs = [
    [
        new RegExp("<(table|td|div|p)(.*?)text-align: (.*?);(.*?)?>", "g"),
        '<$1 align="$3"$2$4>',
    ], // горизонтальное выравнивание
    [
        new RegExp("<(table|td)(.*?)vertical-align: (.*?);(.*?)?>", "g"),
        '<$1 valign="$3"$2$4>',
    ], // вертикальное выравнивание

    // ( |\") перед width обязателен - не дает сграбить max/min-width
    [
        new RegExp('<(table|td)(.*?)( |")width: (.*?)%;(.*?)?>', "g"),
        '<$1 width="$4%"$2$3$5>',
    ], //ширина в процентах
    [
        new RegExp('<(table|td)(.*?)( |")width: (.*?)px;(.*?)?>', "g"),
        '<$1 width="$4"$2$3$5>',
    ], //ширина в пикселах

    [
        new RegExp(
            "<(table|td)(.*?)(background|background-color): (.*?);(.*?)?>",
            "g"
        ),
        '<$1 bgcolor="$4"$2$3: $4;$5>',
    ], // фоновый цвет

    // Удаляяем пробелы в конце инлайновых стилей
    [new RegExp(';( *)"', "g"), ';"'],
    // Удаляем опустевшие инлайновые стили (позорище)))! регулярку лень писать)
    [' style=""', ""],
    [' style=" "', ""],
    [' style="  "', ""],
];

///////////////////////////////////////////////////////////////////
// Очищаем папку pub перед сборкой
///////////////////////////////////////////////////////////////////
var clean = require("gulp-clean");
function cleanBuild() {
    return gulp.src("pub", { read: false, allowEmpty: true }).pipe(clean());
}

///////////////////////////////////////////////////////////////////////
//    Группируем MEDIA QUERIES и записываем их тот же файл
//    Увы, сейчас вынос в отдельный файл не работает, будет время - разобраться
///////////////////////////////////////////////////////////////////////

var mmq = require("gulp-merge-media-queries");
function mergeMediaQueries() {
    return gulp
        .src("__layouts/mailing/css/styles.css")
        .pipe(
            mmq({
                log: true,
                //   use_external: true // BUGGED
            })
        )
        .pipe(gulp.dest("__layouts/mailing/css"));
}

///////////////////////////////////////////////////////////////////////
//    Записываем MEDIA QUERIES в отдельный файл, который потом вставляем в header (через styles)
///////////////////////////////////////////////////////////////////////

// https://stackoverflow.com/questions/56347887/using-gulp-to-split-sass-css-file-into-multiple-css-files-based-on-media-queries

var mediaQueriesSplitter = require("gulp-media-queries-splitter");

function splitMediaQueries() {
    return gulp
        .src("__layouts/mailing/css/styles.css")
        .pipe(
            mediaQueriesSplitter([
                // Include all CSS rules
                // {media: 'all', filename: 'all.css'},

                // Include only CSS rules without screen size based media queries
                { media: "none", filename: "styles.css" },

                // Include CSS rules for small screen sizes and CSS rules without screen size based media queries
                // {media: ['none', {minUntil: '576px'}, {max: '9999999px'}], filename: 'main.css'},

                // Include CSS rules for medium screen sizes (mostly used on tablet)
                // {media: [{min: '576px', minUntil: '768px'}, {min: '576px', max: '768px'}], filename: 'tablet.css'},

                // Include CSS rules for bigger screen sizes (mostly used on desktop)
                {
                    media: { minUntil: "100px" },
                    filename: "styles.responsive.css",
                },
            ])
        )
        .pipe(gulp.dest("__layouts/mailing/css/"));
}

///////////////////////////////////////////////////////////////////
// twig COMPILATION
///////////////////////////////////////////////////////////////////
var twig = require("gulp-twig");

function compileTWIG() {
    return gulp
        .src("__src_letters/*/*.twig")
        .pipe(twig())
        .pipe(gulp.dest("pub/"));
}

///////////////////////////////////////////////////////////////////
//  Добавляем атрибуты к стилям
///////////////////////////////////////////////////////////////////

function prepareToInlining() {
    return gulp
        .src("pub/**/*.html")
        .pipe(replace(preInlineReplaces))
        .pipe(gulp.dest("pub/"));
}

///////////////////////////////////////////////////////////////////
//  Заменяем часть стилей на атрибуты
//  ACHTUNG!!! Некоторые атрибуты могут быть прописаны непосредственно в коде, их в стилях определять не надо
///////////////////////////////////////////////////////////////////

function checkMSOcomments() {
    return gulp
        .src("pub/**/*.html")
        .pipe(replace(msoSafe))
        .pipe(gulp.dest("pub/"));
}

///////////////////////////////////////////////////////////////////
//  Заменяем часть стилей на атрибуты
//  ACHTUNG!!! Некоторые атрибуты могут быть прописаны непосредственно в коде, их в стилях определять не надо
///////////////////////////////////////////////////////////////////

function replaceSomeStyles() {
    return gulp
        .src("pub/**/*.html")
        .pipe(replace(stylesToAttrs))
        .pipe(gulp.dest("pub/"));
}

///////////////////////////////////////////////////////////////////
// SASS COMPILATION.
// Собираем не все файлы, а только styles.less и embed_styles.less, остальные подключаются как инклюды
// ВАЖНО!!!! Потом разобраться с wildcards, чтобы реализовать мультитемплейт
///////////////////////////////////////////////////////////////////
var sass = require("gulp-sass")(require("sass"));
function compileSASS() {
    return gulp
        .src("__layouts/mailing/*styles.scss")
        .pipe(sass())
        .pipe(gulp.dest("__layouts/mailing/css"));
}

///////////////////////////////////////////////////////////////////
// Инлайним на месте. Шортхэнды разбиваем вручную
///////////////////////////////////////////////////////////////////
var inlineCss = require("gulp-inline-css");

function inlineCSS() {
    return gulp
        .src("pub/**/*.html")
        .pipe(
            inlineCss({
                removeStyleTags: false,
            })
        )
        .pipe(gulp.dest("pub/"));
}

//////////////////////////////////////////////////////////////////
// Убираем классы, содержащие inl
///////////////////////////////////////////////////////////////////

function removeUtilizedClassNames() {
    return gulp
        .src("pub/**/*.html")
        .pipe(replace(clearClasses))
        .pipe(gulp.dest("pub/"));
}

///////////////////////////////////////////////////////////////////
// причесываем выходной код
///////////////////////////////////////////////////////////////////
var prettify = require("gulp-prettify");

function doPrettify() {
    return gulp
        .src("pub/**/*.html")
        .pipe(
            prettify({
                indent_size: 2,
                unformatted: ["font", "span", "b", "strong", "i", "em"],
            })
        )
        .pipe(gulp.dest("pub/"));
}

///////////////////////////////////////////////////////////////////
// Типограф
///////////////////////////////////////////////////////////////////
const typograf = require("gulp-typograf");
function doTypograf() {
    return gulp
        .src("pub/**/*.html")
        .pipe(
            typograf({
                disableRule: ["ru/other/phone-number"],
                safeTags: [
                    ["@{", "}"],
                    ["<font>", "</font>"],
                ],
                locale: ["ru", "en-US"],
                htmlEntity: { type: "name" }, // Type of HTML entities: 'digit' - &#160;, 'name' - &nbsp;, 'default' - UTF-8
            })
        )
        .pipe(gulp.dest("pub/"));
}

///////////////////////////////////////////////////////////////////
// Удаляем скомпилированные стили после инлайнинга/вставки в код
///////////////////////////////////////////////////////////////////
function removeCSSwhenTWIGready() {
    return gulp.src("__layouts/mailing/css/", { read: false }).pipe(clean());
}

///////////////////////////////////////////////////////////////////
// Устанавливаем последовательность операций
///////////////////////////////////////////////////////////////////

var build = gulp.series(
    cleanBuild,
    compileSASS,
    mergeMediaQueries,
    splitMediaQueries,
    compileTWIG,
    checkMSOcomments,
    prepareToInlining,

    ///////////////////////////////////////////////////////////////////
    // Для отладки комментируем следующие строки.
    ///////////////////////////////////////////////////////////////////

    inlineCSS,
    replaceSomeStyles,
    removeCSSwhenTWIGready,
    removeUtilizedClassNames,

    ///////////////////////////////////////////////////////////////////
    // Не комментриуем - просто причесалка. Типограф ставим ПОСЛЕ причесалки
    ///////////////////////////////////////////////////////////////////

    doPrettify,
    doTypograf
);

exports.default = build;
