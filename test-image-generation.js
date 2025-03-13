import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Available models
const models = {
    1: {
        name: "Stable Diffusion XL",
        id: "stabilityai/stable-diffusion-xl-base-1.0",
        description: "High-quality, detailed images",
        maxSteps: 50,
        guidanceScale: 7.5
    },
    2: {
        name: "Stable Diffusion 2.1",
        id: "stabilityai/stable-diffusion-2-1",
        description: "Balanced quality and speed",
        maxSteps: 40,
        guidanceScale: 7.0
    },
    3: {
        name: "OpenJourney",
        id: "prompthero/openjourney",
        description: "Midjourney-like artistic style",
        maxSteps: 30,
        guidanceScale: 8.0
    }
};

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'generated-images');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Function to display model options
function displayOptions() {
    console.log(chalk.cyan('\n🎨 AI Image Generator'));
    console.log(chalk.gray('===================\n'));
    console.log(chalk.yellow('Available Models:'));
    console.log(chalk.gray('------------------'));
    Object.entries(models).forEach(([key, model]) => {
        console.log(chalk.green(`${key}. ${model.name}`));
        console.log(chalk.gray(`   ${model.description}`));
        console.log(chalk.gray(`   Steps: ${model.maxSteps} | Guidance: ${model.guidanceScale}`));
    });
    console.log(chalk.gray('------------------\n'));
}

// Function to get user input
function getUserInput(question) {
    return new Promise((resolve) => {
        rl.question(chalk.yellow(question), (answer) => {
            resolve(answer);
        });
    });
}

// Function to show progress
function showProgress(message) {
    process.stdout.write(chalk.cyan(`\r${message}`));
}

// Function to format file size
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

async function generateImage(modelId, prompt) {
    try {
        const model = models[modelId];
        console.log(chalk.cyan(`\nGenerating image using ${model.name}...`));
        showProgress('Processing...');
        
        const response = await hf.textToImage({
            model: model.id,
            inputs: prompt,
            parameters: {
                negative_prompt: "blurry, bad quality, distorted, ugly, deformed, disfigured, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, ugly, disgusting, amputation",
                num_inference_steps: model.maxSteps,
                guidance_scale: model.guidanceScale,
                width: 1024,
                height: 1024
            }
        });

        // Log the response details
        console.log(chalk.green('\n\n✅ Generation Complete!'));
        console.log(chalk.gray('\nAPI Response Details:'));
        console.log(chalk.gray('-------------------'));
        console.log(chalk.white('Model used:'), chalk.cyan(model.name));
        console.log(chalk.white('Response type:'), chalk.cyan(typeof response));
        console.log(chalk.white('Is Blob:'), chalk.cyan(response instanceof Blob));
        console.log(chalk.white('File size:'), chalk.cyan(formatFileSize(response.size)));
        console.log(chalk.white('File type:'), chalk.cyan(response.type));
        console.log(chalk.gray('-------------------\n'));

        // Convert Blob to ArrayBuffer and then to Buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `generated-${model.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.png`;
        const outputPath = path.join(outputDir, filename);
        
        fs.writeFileSync(outputPath, buffer);
        
        console.log(chalk.green(`✨ Image saved as: ${filename}`));
        console.log(chalk.gray(`📁 Location: ${outputPath}`));
    } catch (error) {
        console.error(chalk.red('\n❌ Error generating image:'), error);
    }
}

async function main() {
    try {
        displayOptions();
        
        // Get model selection
        const modelSelection = await getUserInput('Select a model (1-3): ');
        const modelId = parseInt(modelSelection);
        
        if (!models[modelId]) {
            console.log(chalk.red('❌ Invalid model selection. Please choose 1-3.'));
            rl.close();
            return;
        }

        // Get prompt from user
        const prompt = await getUserInput('Enter your image prompt: ');
        
        // Generate image
        await generateImage(modelId, prompt);
        
        // Ask if user wants to generate another image
        const again = await getUserInput('\nWould you like to generate another image? (yes/no): ');
        if (again.toLowerCase() === 'yes') {
            main();
        } else {
            console.log(chalk.cyan('\n👋 Thank you for using the AI Image Generator!'));
            console.log(chalk.gray('Check the generated-images folder for your creations.'));
            rl.close();
        }
    } catch (error) {
        console.error(chalk.red('❌ Error:'), error);
        rl.close();
    }
}

// Start the application
main(); 
