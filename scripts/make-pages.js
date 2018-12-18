#!/usr/bin/env node

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const s3 = require('s3');
const util = require('util');
const {
  GAMES_ROOT,
  REPO_ROOT,
  SKILLS_ROOT,
  grades,
  gradeLabels,
  downloadGameData,
  getGameURL,
  getGrade,
  slugify
} = require('./helpers');

const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);
const writeFile = util.promisify(fs.writeFile);


// Main function for the whole script
async function main() {
  const data = await downloadGameData();

  writeGamesData(data);
  createGamePages(data);

  const skillData = await writeSkillsData(data);
  createSkillPages(skillData);
}


// Create the games data file for the list page
const writeGamesData = async function(data) {
  const { categories, games } = data;

  const result = grades.map(function(grade) {
    const gradeGames = games.filter(game => game.level.startsWith(grade));

    const gradeCategories = categories
      .map(function(category) {
        return {
          name: category,
          games: gradeGames
            .filter(game => game.category === category)
            .sort((a, b) => a.levelIndex - b.levelIndex)
            .map(game => _gameData(game))
        };
      })
      .filter(category => category.games.length > 0);

    return {
      grade: gradeLabels[grade],
      categories: gradeCategories
    };
  });

  const fileData = JSON.stringify(result, null, 4);
  return await writeFile(`${REPO_ROOT}/site/data/${GAMES_ROOT}.json`, fileData);
}


// Create the skills data file for the list page
const writeSkillsData = async function(data) {
  const { categories, games } = data;
  const result = categories
    .map(function(category) {
      return {
        category,
        games: games
          .filter(game => game.category === category)
          .sort((a, b) => a.levelIndex - b.levelIndex)
          .map(game => _gameData(game))
      };
    })
    .filter(category => category.games.length > 0);

  const fileData = JSON.stringify(result, null, 4);
  await writeFile(`${REPO_ROOT}/site/data/${SKILLS_ROOT}.json`, fileData);

  return result;
}


// Create the individual game pages
const createGamePages = async function(data) {
  const { games } = data;
  const gamesDir = `${REPO_ROOT}/site/content/${GAMES_ROOT}`;

  // Remove all the game pages
  const files = await readdir(gamesDir);
  await Promise.all(
    files.map(f => unlink(path.join(gamesDir, f)))
  );

  // Make the games list page
  const indexData = [
    '+++',
    'title = "Math Games | MathBRIX"',
    'description = "A complete list of every MathBRIX game"',
    `url = "/${GAMES_ROOT}"`,
    '+++'
  ].join('\n');
  await writeFile(`${gamesDir}/_index.md`, indexData);

  // Make the single game pages
  for (const game of games) {
    // TODO: remove this conversion when
    // the classic game names are removed from prod
    const oldSubgames = {
      'CREATE_COMBO_WITHIN_10': 'CLASSIC',
      'COLORS_VS_BRIX': 'CLASSIC',
      'MC_TY_1': 'CLASSIC_TY_1',
      'MC_DR_1': 'CLASSIC_DR_1',
      'MC_TY_10': 'CLASSIC_TY_10',
      'MC_DR_10': 'CLASSIC_DR_10'
    };
    const subgame = Object.keys(oldSubgames).includes(game.subgame) ?
      oldSubgames[game.subgame] : game.subgame;
    const data = [
      '+++',
      `title = "${game.title}"`,
      `description = "${game.title}"`,
      `url = "${getGameURL(game)}"`,
      `grade = "${getGrade(game)}"`,
      `category = "${game.category}"`,
      `gametype = "${game.game}"`,
      `subgametype = "${subgame}"`,
      '+++'
    ].join('\n');
    const path = `${gamesDir}/${slugify(game.title)}.md`;
    await writeFile(path, data);
  }
}

// Create the individual skill pages
const createSkillPages = async function(categoryData) {
  const skillsDir = `${REPO_ROOT}/site/content/${SKILLS_ROOT}`;

  // Remove all the skill pages
  const files = await readdir(skillsDir);
  await Promise.all(
    files.map(f => unlink(path.join(skillsDir, f)))
  );

  // Make the skills list page
  const indexData = [
    '+++',
    'title = "Math Skills | MathBRIX"',
    'description = "A complete list of every math skill that MathBRIX teaches"',
    `url = "/${SKILLS_ROOT}"`,
    '+++'
  ].join('\n');
  await writeFile(`${skillsDir}/_index.md`, indexData);

  // Make the single game pages
  for (const { category } of categoryData) {
    const data = [
      '+++',
      `title = "${category}"`,
      `url = "/${SKILLS_ROOT}/${slugify(category)}"`,
      '+++'
    ].join('\n');
    const path = `${skillsDir}/${slugify(category)}.md`;
    await writeFile(path, data);
  }
}


const _gameData = function(game) {
  return {
    name: game.title,
    slug: slugify(game.title),
    url: getGameURL(game),
    image: slugify(game.subgame)
  };
}


main();
