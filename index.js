const puppeteer = require('puppeteer');
require('dotenv').config();

(async () => {

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://kundenportal.tinetz.at/powercommerce/tinetz/fo/portal/loginProcess');
    await page.type("#login", process.env.USERNAME);
    await page.type("#password", process.env.PASSWORD);
    await Promise.all([
        page.click('#loginButton'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    await page.goto('https://kundenportal.tinetz.at/powercommerce/tinetz/fo/portal/consumptionDetails?meteringCode=' + process.env.METERING_CODE);
    await page.click('#dateType_DAY');
    const [dl] = await page.$x("//a[@title='Download Menü']");
    if (dl) {
        await dl.click();
    } else {
        console.log("Download Menü not found");
    }
    const [button] = await page.$x("//a[contains(., 'Export als CSV-Datei')]");
    if (button) {
        await Promise.all([
             button.click(),
             page.waitForNavigation({ waitUntil: 'networkidle0' }),
            ]);
    } else {
        console.log("CSV download not found");
    }
    await delay(5000); 
    await browser.close();
})();

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}