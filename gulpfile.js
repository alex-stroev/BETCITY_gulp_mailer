"use strict";
var gulp = require("gulp");
var replace = require("gulp-batch-replace");

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
gulp.task("clean_build", function () {
    return gulp.src("pub", { read: false, allowEmpty: true }).pipe(clean());
});

///////////////////////////////////////////////////////////////////
// twig COMPILATION
///////////////////////////////////////////////////////////////////
var twig = require("gulp-twig");
gulp.task("twig", function () {
    return gulp
        .src("__src_letters/*/*.twig")
        .pipe(twig())
        .pipe(gulp.dest("pub/"));
});

///////////////////////////////////////////////////////////////////
//  Добавляем атрибуты к стилям
///////////////////////////////////////////////////////////////////
gulp.task("prepareToInlining", function () {
    return gulp
        .src("pub/**/*.html")
        .pipe(replace(preInlineReplaces))
        .pipe(gulp.dest("pub/"));
});

///////////////////////////////////////////////////////////////////
//  Заменяем часть стилей на атрибуты
//  ACHTUNG!!! Некоторые атрибуты могут быть прописаны непосредственно в коде, их в стилях определять не надо
///////////////////////////////////////////////////////////////////
gulp.task("replaceSomeStyles", function () {
    return gulp
        .src("pub/**/*.html")
        .pipe(replace(stylesToAttrs))
        .pipe(gulp.dest("pub/"));
});

///////////////////////////////////////////////////////////////////
// SASS COMPILATION.
// Собираем не все файлы, а только styles.less и embed_styles.less, остальные подключаются как инклюды
// ВАЖНО!!!! Потом разобраться с wildcards, чтобы реализовать мультитемплейт
///////////////////////////////////////////////////////////////////
var sass = require("gulp-sass")(require("sass"));

gulp.task("sass", function () {
    return gulp
        .src("__layouts/mailing/*styles.scss")
        .pipe(sass())
        .pipe(gulp.dest("__layouts/mailing/css"));
});

///////////////////////////////////////////////////////////////////
// Инлайним на месте. Шортхэнды разбиваем вручную
///////////////////////////////////////////////////////////////////
var inlineCss = require("gulp-inline-css");
gulp.task("inline_css", function () {
    return gulp
        .src("pub/**/*.html")
        .pipe(
            inlineCss({
                removeStyleTags: false,
            })
        )
        .pipe(gulp.dest("pub/"));
});

///////////////////////////////////////////////////////////////////
// причесываем выходной код
///////////////////////////////////////////////////////////////////
var prettify = require("gulp-prettify");

gulp.task("prettify", function () {
    return gulp
        .src("pub/**/*.html")
        .pipe(
            prettify({
                indent_size: 2,
                unformatted: ["font", "span", "b", "strong", "i", "em"],
            })
        )
        .pipe(gulp.dest("pub/"));
});

///////////////////////////////////////////////////////////////////
// Типограф
///////////////////////////////////////////////////////////////////
const typograf = require("gulp-typograf");
gulp.task("typograf", async function () {
    gulp.src("pub/**/*.html")
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
});

///////////////////////////////////////////////////////////////////
// Устанавливаем последовательность операций
///////////////////////////////////////////////////////////////////
var runSequence = require("gulp4-run-sequence");

gulp.task("default", async function () {
    runSequence(
        "clean_build",
        "sass",
        //   'mmq',
        "twig",
        //   'copyimages',
        // 'copyimages2',
        "prepareToInlining",

        ///////////////////////////////////////////////////////////////////
        // Для отладки комментируем следующие строки.
        ///////////////////////////////////////////////////////////////////
        "inline_css",
        "replaceSomeStyles",
        // 'clean', // глючит, разобраться
        //   'remove_classes',

        ///////////////////////////////////////////////////////////////////
        // Не комментриуем - просто причесалка. Типограф ставим ПОСЛЕ причесалки
        ///////////////////////////////////////////////////////////////////

        "prettify",
        "typograf"
    );
});
