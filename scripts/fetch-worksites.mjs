// Using built-in fetch (Node.js 20+)
// NextAuth session-based authentication - Cookie only, no CSRF token for GET requests

const url = "http://localhost:3000/api/worksites";

const headers = {
  "Cookie": "next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..jqnb5FIIvTSMbyJ_.Wn1npab9qYpAYIkjN9nvqaSfh0Om5ZZ97IwovfWkzLaPVT-ifH0K4bp3tIG-bcWcNg0QhMtsCZGNYJ9mzlD85vlk6jOOsgkCK3736TdGH-a5VFeNlXMDvNb1hvh-4637URFXuyS3zvt9woohTZECifsndTmeTFJhf_Z5qQ4Wc6wjUOzZ0l8MSX28hyjHM7w9WDSspaETcFvwfIzXOwyn_2EV4XM9_3gMly2o6VZvsboSAS1sAgtpVX_n1vkmLK_b2tBXumsjSR1M1IPPt0kyLmvyZpgxDFkDFLIY_YpZuigFFwb8rnf08OB_TFP1co75KUM7f4yfvMFHYOjdyrSbrPDrnU6g.PA_BJcC228DqMu_4xubLcw"
};

try {
  const response = await fetch(url, { method: "GET", headers });
  
  if (!response.ok) {
    const errorText = await response.text();
    const errorData = { error: errorText, status: response.status };
    
    // Log all response headers if unauthorized
    if (response.status === 401) {
      const headersObj = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      errorData.headers = headersObj;
    }
    
    console.log(JSON.stringify(errorData, null, 2));
    process.exit(1);
  }
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.log(JSON.stringify({ error: error.message, status: error.status || 0 }, null, 2));
  process.exit(1);
}

