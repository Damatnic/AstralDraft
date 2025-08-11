const fs = require('fs');
const path = require('path');

try {
    const filePath = './components/oracle/TrainingDataManager.tsx';
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for basic syntax issues
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    console.log('File analysis:');
    console.log(`Open braces: ${openBraces}, Close braces: ${closeBraces}`);
    console.log(`Open parens: ${openParens}, Close parens: ${closeParens}`);
    console.log(`Brace balance: ${openBraces === closeBraces ? 'BALANCED' : 'UNBALANCED'}`);
    console.log(`Paren balance: ${openParens === closeParens ? 'BALANCED' : 'UNBALANCED'}`);
    
    // Check if file ends properly
    const lastLines = content.split('\n').slice(-10);
    console.log('\nLast 10 lines:');
    lastLines.forEach((line, i) => {
        console.log(`${lastLines.length - 10 + i + 1}: ${line}`);
    });
    
} catch (error) {
    console.error('Error reading file:', error.message);
}
