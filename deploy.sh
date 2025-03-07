#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

# 构建
npm run build

# 进入构建文件夹
cd dist


git init
git add -A
git commit -m 'deploy'

# 部署到 GitHub Pages
git push -f git@github.com:causalkits/markdown-converter.git main:gh-pages

cd -