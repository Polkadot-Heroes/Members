const fs = require('fs');
const path = require('path');

const issuePayload = JSON.parse(process.env.ISSUE_PAYLOAD);

const labelNames = issuePayload.labels.map(label => label.name);

if (!labelNames.includes('nomination-accepted')) {
    process.exit(0); // Exit if the issue is not labeled with 'nomination-accepted'
}

const name = getNameFromIssue(issuePayload); // Extract the name from the issue

console.log(`NAME: ${name}`);

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

console.log(`ROOKIE START INDEX: ${rookieStartIndex}`);
console.log(`ROOKIE END INDEX: ${rookieEndIndex}`);

rookies = rookies.slice(rookieStartIndex, rookieEndIndex).split('###').slice(1); // Split profiles by '### '

console.log(`ROOKIES AFTER SLICE: ${rookies}`);

const heroStartIndex = heroes.indexOf('## Heroes List') + '## Heroes List'.length;
const heroEndIndex = heroes.indexOf('## Contributing');

heroes = heroes.slice(heroStartIndex, heroEndIndex).split('###').slice(1); // Split profiles by '### '

const rookieIndex = rookies.findIndex(profile => {
    const nameRegex = new RegExp(`^${name}\\b`, 'i'); // Create a regular expression to match the profile name
    console.log(`NAME REGEX: ${nameRegex}`);
    console.log(`PROFILE: ${profile}`)
    const profileName = profile.match(/^Name:\s*(?!.*Template)(.*)$/im)[1]; // Extract the profile name from the profile, excluding profiles that contain the word "Template"
    console.log(`PROFILE NAME: ${profileName}`);
    return nameRegex.test(profileName); // Test if the profile name matches the regular expression
});

let profile = rookies.slice(rookieIndex, 1)[0]; // Remove the profile from rookies

console.log(`PROFILE: ${profile}`);

// Check if the hero with the same name and GitHub profile already exists
const profileGithubProfile = getAttributeFromProfile(profile, 'GitHub Profile');  // Extract GitHub Profile from the profile

const existingHero = heroes.find(hero => {
    const heroName = hero.split('\n')[0];  // Extract the first line (name) from the hero profile
    const heroGithubProfile = getAttributeFromProfile(hero, 'GitHub Profile');  // Extract GitHub Profile from the hero profile
    return heroName === name && heroGithubProfile === profileGithubProfile;
});
  
if (existingHero) {
    console.warn(`Hero with the same name '${name}' and GitHub profile already exists in Heroes/README.md`);
    process.exit(0); // Exit without adding the profile to the Heroes list
}

// Find the correct index to insert the profile alphabetically
let heroIndex = heroes.findIndex(hero => {
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

if (heroIndex === -1) heroIndex = heroes.length; // If no heroes have a name "greater" than the rookie, append at the end

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

heroes.splice(heroIndex, 0, profile); // Insert the profile into the heroes list at the correct index

// Write back to the README files
fs.writeFileSync(rookiesFilePath, rookies.join('### '), 'utf-8');
fs.writeFileSync(heroesFilePath, heroes.join('### '), 'utf-8');

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
  
    console.log('ATTRIBUTE:', attribute);
    console.log('PROFILE:', profile);
    
    const match = profile.match(new RegExp(`- ${attribute}: (.+)`));
    return match ? match[1] : null;
}

// Function to extract the image name from the profile
function getImageFromProfile(profile) {
    if (!profile) {
        console.error('Profile is undefined');
        return null;
    }

    console.log(`PROFILE in getImageFromProfile: ${profile}`); 

    const match = profile.match(/<img src=".\/images\/(.+)" width="100"/);
    return match ? match[1] : null;
}
