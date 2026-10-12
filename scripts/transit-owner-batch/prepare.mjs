import { prepareBatchFiles } from '../../src/astro-writing/personalTransitPreparation.mjs';
const [catalogPath,voiceGoldPath,readerMeaningsPath,inputPlanPath,outputDirectory] = process.argv.slice(2);
if (!catalogPath || !voiceGoldPath || !readerMeaningsPath || !inputPlanPath || !outputDirectory) throw Error('Usage: node prepare.mjs /private/catalog.json /private/CURRENT_TRANSIT_VOICE_GOLD.json /private/reader-meanings.json /private/input-plan.json /private/dry-run');
const receipt = prepareBatchFiles({catalogPath,voiceGoldPath,readerMeaningsPath,inputPlanPath,outputDirectory});
console.log(JSON.stringify({contacts:receipt.contacts,passages:receipt.passages,providerCalls:0,inputReview:receipt.inputReview}));
