const fs = require('fs');
const path = require('path');

const issuePayload = JSON.parse(process.env.ISSUE_PAYLOAD);

const labelNames = issuePayload.labels.map(label => label.name);

if (!labelNames.includes('nomination-accepted')) {
    process.exit(0); // Exit if the issue is not labeled with 'nomination-accepted'
}

const name = getNameFromIssue(issuePayload); // Extract the name from the issue

if (!name) {
    console.error('Name not found in the issue');
    process.exit(1);
}

const rookiesFilePath = path.join(__dirname, '../../../../Rookies/README.md');
const heroesFilePath = path.join(__dirname, '../../../../Heroes/README.md');
const rookiesImagesDir = path.join(__dirname, '../../../../Rookies/images');
const heroesImagesDir = path.join(__dirname, '../../../../Heroes/images');

if (!fs.existsSync(rookiesFilePath)) {
    console.error('Rookies/README.md does not exist');
    process.exit(1);
}

if (!fs.existsSync(heroesFilePath)) {
    console.error('Heroes/README.md does not exist');
    process.exit(1);
}

let rookies = fs.readFileSync(rookiesFilePath, 'utf-8');
let heroes = fs.readFileSync(heroesFilePath, 'utf-8');

if (!rookies.trim()) {
    console.error('Rookies/README.md is empty');
    process.exit(1);
}

if (!heroes.trim()) {
    console.error('Heroes/README.md is empty');
    process.exit(1);
}

const rookieStartIndex = rookies.indexOf('## Rookies List') + '## Rookies List'.length;
const rookieEndIndex = rookies.indexOf('## Contributing');

const heroesStartIndex = heroes.indexOf('## Heroes List') + '## Heroes List'.length;
const heroesEndIndex = heroes.indexOf('## Contributing');

const rookiesList = rookies.slice(rookieStartIndex, rookieEndIndex);
const heroesList = heroes.slice(heroesStartIndex, heroesEndIndex);

const rookieIndex = rookiesList.indexOf(`### ${name}`);
if (rookieIndex === -1) {
    console.error(`Profile for ${name} not found in Rookies list`);
    process.exit(1);
}

let profile = rookiesList.slice(rookieIndex, rookieIndex + 1)[0];

// Check if the hero with the same name and GitHub profile already exists
const profileGithubProfile = getAttributeFromProfile(profile, 'GitHub Profile');  // Extract GitHub Profile from the profile

const existingHero = heroesList.find(hero => {
    const heroName = hero.split('\n')[0];  // Extract the first line (name) from the hero profile
    const heroGithubProfile = getAttributeFromProfile(hero, 'GitHub Profile');  // Extract GitHub Profile from the hero profile
    return heroName === name && heroGithubProfile === profileGithubProfile;
});

if (existingHero) {
    console.warn(`Hero with the same name '${name}' and GitHub profile already exists in Heroes list`);
    process.exit(0); // Exit without adding the profile to the Heroes list
}

// Find the correct index to insert the profile alphabetically
let heroIndex = heroesList.findIndex(hero => {
    const heroName = hero.split('\n')[0];  // Extract the first line (name) from the hero profile
    const comparison = heroName.localeCompare(name);
    if (comparison > 0) {
        return true;
    } else if (comparison === 0) {
        const heroGithubProfile = getAttributeFromProfile(hero, 'GitHub Profile');  // Extract GitHub Profile from the hero profile
        return heroGithubProfile.localeCompare(profileGithubProfile) > 0;
    } else {
        return false;
    }
});

if (heroIndex === -1) heroIndex = heroesList.length; // If no heroes have a name "greater" than the rookie, append at the end

// Move image
let imageName = getImageFromProfile(profile);
let sourcePath = path.join(rookiesImagesDir, imageName);
let destPath = path.join(heroesImagesDir, imageName);

if (fs.existsSync(sourcePath)) {
    let counter = 1;
    while(fs.existsSync(destPath)) {
        const parsedPath = path.parse(imageName);
        imageName = parsedPath.name + counter + parsedPath.ext;
        destPath = path.join(heroesImagesDir, imageName);
        counter++;
    }

    fs.renameSync(sourcePath, destPath); // Move the image
    profile = profile.replace(/<img src=".\/images\/(.+)" width="100"/, `<img src="./images/${imageName}" width="100"/>`);  // Update the profile with the new image name
 } else {
    console.warn('Image not found in Rookies/images');
}

heroesList.splice(heroIndex, 0, profile); // Insert the profile into the heroes list at the correct index

// Update the README files
const updatedRookies = rookies.slice(0, rookieStartIndex) + rookiesList.join('\n\n### ') + rookies.slice(rookieEndIndex);
const updatedHeroes = heroes.slice(0, heroesStartIndex) + heroesList.join('\n\n### ') + heroes.slice(heroesEndIndex);

fs.writeFileSync(rookiesFilePath, updatedRookies, 'utf-8');
fs.writeFileSync(heroesFilePath, updatedHeroes, 'utf-8');

// Function to extract the name from the issue title
function getNameFromIssue(issuePayload) {
    const match = issuePayload.title.match(/^\[Nomination\] : (.+)/);
    return match ? match[1] : null;
}

// Function to extract additional attribute from the profile
function getAttributeFromProfile(profile, attribute) {
    if (!profile) {
        console.error('Profile is undefined');
        return null;
    }

    const match = profile.match(new RegExp(`- ${attribute}: (.+)`));
    return match ? match[1] : null;
}

// Function to extract the image name from the profile
function getImageFromProfile(profile) {
    if (!profile) {
        console.error('Profile is undefined');
        return null;
    }

    const match = profile.match(/<img src=".\/images\/(.+)" width="100"/);
    return match ? match[1] : null;
}