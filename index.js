// Require necessary packages to run script
const axios = require("axios");
const core = require('@actions/core');
let i = 1;

/// Retrieves a bearer token using client id and secret
async function getBearerToken(clientId, clientSecret, tenantId, orgUrl) {
    try {
        const response = await axios.post(
            `https://login.microsoftonline.com/${tenantId}/oauth2/token`,
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&resource=${orgUrl}`,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );
        console.log("Bearer token Acquired");
        return response.data.access_token;
    } catch (error) {
        console.error(error);
    }
}


async function updateFlowOwners(bearerToken, orgUrl, ownerId, system) {
    let flows = null;
    // Retrieve all modern flows that do not already have the desired owner and filters out 'SYSTEM' Account flows
    try {
        flows = await axios.get(QueryUrl(orgUrl, ownerId, system), {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
            },
        });
        console.log(`Flows Retrieved. Count: ${flows.data.value.length}`);
    } catch (error) {
        console.error(error);
        console.log(`Retrying...`);
        await retry(axios.get, [QueryUrl(orgUrl, ownerId, system), {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
            },
        }]);
    }

    async function updateFlow(flow) {
        console.log(`updating flow now: ${i}`);
        try {
            await axios.patch(`${orgUrl}/api/data/v9.1/workflows(${flow.workflowid})`,
                {
                    //"description": "This flow will ensure consistency across systems.",
                    //"statecode": 1,
                    "ownerid@odata.bind": `systemusers(${ownerId})`
                },
                {
                    headers: {
                        Authorization: `Bearer ${bearerToken}`,
                        'Accept': 'application/json',
                        'OData-Version': '4.0',
                        'Content-Type': 'application/json',
                        'OData-MaxVersion': '4.0'
                    }
                }
            );
        } catch (error) {
            console.log(flow.name + ': ' + error.response.data.error.message);
            console.log('Please update ' + flow.name + ' connection references as this is the usual culprit');
        }
        i++;
        if (i < flows.data.value.length) {
            console.log('Waiting one second to avoid 429: Too Many Requests Error')
            setTimeout(() => updateFlow(flows.data.value[i]), 1000);
        } else {
            console.log(`Flows Updated Successfully`);
            console.log("Exiting....");
        }
    }
    updateFlow(flows.data.value[i]);
}

async function retry(func, args) {
    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const response = await func(...args);
            return response;
        } catch (error) {
            console.error(error);
            retries++;
            console.log(`Retrying in ${retries} second(s)`);
            await new Promise(resolve => setTimeout(resolve, retries * 1000));
        }
    }
    console.log(`Max retries reached. Exiting...`);
    process.exit(1);
}


function QueryUrl(orgUrl, ownerId, system) {
    return system != null ? `${orgUrl}/api/data/v9.1/workflows?$filter=category eq 5 and _ownerid_value ne ${ownerId} and _ownerid_value ne ${system}` : `${orgUrl}/api/data/v9.1/workflows?$filter=category eq 5 and _ownerid_value ne ${ownerId}`;
}



async function main() {
    console.log("Entering main...")
    // Grab all required parameters
    var clientId =  core.getInput('clientId', { required: true });
    var clientSecret = core.getInput('clientSecret', { required: true });
    var tenantId = core.getInput('tenantId', { required: true });
    var orgUrl =  core.getInput('orgUrl', { required: true });
    var ownerId = core.getInput('ownerId', { required: true });
    var system =  core.getInput('system', { required: false });

    console.log("Grabbed Variables Successfully");
    try {
        const bearerToken = await getBearerToken(clientId, clientSecret, tenantId, orgUrl);
        console.log(`Entering Flow Updates`);
        updateFlowOwners(bearerToken, orgUrl, ownerId, system);
    }
    catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }
}

// Call the main function to run the action
main();

