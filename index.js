const puppeteer = require('puppeteer');
require('dotenv').config();

(async () => {

    const browser = await puppeteer.launch({headless: false});
    
    const page = await browser.newPage();
    await page.goto('https://kundenportal.tinetz.at/powercommerce/tinetz/fo/portal/loginProcess');
    await page.click('#modalSave');
    await page.type("#login", process.env.USERNAME);
    await page.type("#password", process.env.PASSWORD);
    await Promise.all([
        page.click('#loginButton'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
    await page.goto('https://kundenportal.tinetz.at/powercommerce/tinetz/fo/portal/consumptionDetails?meteringCode=' + process.env.METERING_CODE, {timeout: 5000});
    await new Promise(r => setTimeout(r, 5000));
    
    await page.waitForSelector('#icon-bar-dropdown', {
        visible: true,
      });
    await page.click('.fa-caret-square-left');
    //await page.click('#dateType_DAY');
    await page.click('.fa-download');
    const [button] = await page.$x("//a[contains(., 'Export als CSV-Datei')]");
    button.click()
    await delay(5000); 
    await browser.close();
})();

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
}