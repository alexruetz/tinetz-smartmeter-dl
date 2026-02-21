const puppeteer = require('puppeteer')
require('dotenv').config();

// read arguments if multiple past days should be loaded
const args = process.argv.slice(1)
var days = 1;
if (args[1]) {
    console.log(args);
    days = Number(args[1])
}

if (days <= 0) {
    console.error('Error: Number of days must be positive');
    process.exit(1);
}

console.log(`Try to load csv for ${days} days`)
var daysDownloaded = 0;

// Timeout configs
const CONFIG = {
    defaultTimeout: 60000,   
    navigationTimeout: 90000,   
};

// wait for page load
async function waitForPageStable(page, timeout = 5000) {
    try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout });
    } catch (e) {
    }
}

// click and wait
async function safeClick(page, selector, options = {}) {
    const { timeout = CONFIG.defaultTimeout, waitAfter = 500 } = options;
    await page.waitForSelector(selector, { visible: true, timeout });
    await page.click(selector);
    await delay(waitAfter);
}

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: process.env.HEADLESS || true
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(CONFIG.defaultTimeout);
        page.setDefaultNavigationTimeout(CONFIG.navigationTimeout);

        const client = await page.target().createCDPSession()
        await client.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: process.env.DOWNLOAD_DIR,
            eventsEnabled: true,
        })

        // Download-Tracking
        let downloadInProgress = false;
        let downloadComplete = false;
        
        client.on('Browser.downloadWillBegin', () => {
            downloadInProgress = true;
            downloadComplete = false;
        });
        
        client.on('Browser.downloadProgress', (event) => {
            if (event.state === 'completed') {
                downloadComplete = true;
                downloadInProgress = false;
            } else if (event.state === 'canceled') {
                downloadInProgress = false;
            }
        });

        async function waitForDownload(timeout = 30000) {
            const startTime = Date.now();
            while (!downloadInProgress && !downloadComplete) {
                if (Date.now() - startTime > timeout) {
                    throw new Error('Download did not start within timeout');
                }
                await delay(100);
            }
            while (!downloadComplete) {
                if (Date.now() - startTime > timeout) {
                    throw new Error('Download did not complete within timeout');
                }
                await delay(100);
            }
            downloadComplete = false;
        }

        // login
        await page.goto('https://kundenportal.tinetz.at', { 
            waitUntil: 'networkidle2',
            timeout: CONFIG.navigationTimeout 
        });

        // cookie consent
        await page.waitForSelector('#modalSave', { visible: true, timeout: 30000 });
        await page.click('#modalSave');

        await page.waitForSelector('#login', { visible: true, timeout: CONFIG.defaultTimeout });
        await page.type("#login", process.env.USERNAME);
        await page.type("#password", process.env.PASSWORD);

        await Promise.all([
            page.click('#loginButton'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.navigationTimeout }),
        ]);

        // goto consumption page
        await page.goto(
            'https://kundenportal.tinetz.at/powercommerce/tinetz/fo/portal/consumptionDetails?meteringCode=' + process.env.METERING_CODE, 
            { waitUntil: 'networkidle2', timeout: CONFIG.navigationTimeout }
        );

        await page.waitForSelector('#icon-bar-dropdown', {
            visible: true,
            timeout: CONFIG.defaultTimeout,
        });

        // switch to day
        await page.waitForSelector("input[value='Tag']", { visible: true, timeout: CONFIG.defaultTimeout });
        await page.$eval("input[value='Tag']", elem => elem.click());
        await waitForPageStable(page);

        // download loop
        do {
            console.log(`Download ${daysDownloaded + 1}/${days}`);
            
            await safeClick(page, '.fa-caret-square-left', { waitAfter: 1500 });
            await waitForPageStable(page);
            console.log('navigate to past day');

            await safeClick(page, '.fa-download', { waitAfter: 500 });
            
            await page.waitForSelector('ul.dropdown-menu.show', { visible: true, timeout: 10000 });
            
            const clicked = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('ul.dropdown-menu.show a.dropdown-item'));
                const csvLink = links.find(link => link.textContent.trim() === 'Export als CSV-Datei');
                if (csvLink) {
                    csvLink.click();
                    return true;
                }
                return false;
            });
            
            if (!clicked) {
                throw new Error('Did not find csv download link');
            }

            await waitForDownload();
            daysDownloaded++;
            
        } while (daysDownloaded < days);

        console.log(`downloaded ${daysDownloaded} days successful`);
        await browser.close();
        
    } catch (error) {
        console.error('error occured:', error.message);
        if (browser) {
            await browser.close();
        }
        process.exit(1);
    }
})();

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}
