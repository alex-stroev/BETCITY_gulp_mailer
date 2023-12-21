"use strict";
var gulp = require("gulp");

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
        //   'prepareToInlining',

        ///////////////////////////////////////////////////////////////////
        // Для отладки комментируем следующие строки.
        ///////////////////////////////////////////////////////////////////
        //   'inline_css',
        //   'replaceSomeStyles',
        // 'clean', // глючит, разобраться
        //   'remove_classes',

        ///////////////////////////////////////////////////////////////////
        // Не комментриуем - просто причесалка. Типограф ставим ПОСЛЕ причесалки
        ///////////////////////////////////////////////////////////////////

        "prettify",
        "typograf"
    );
});
