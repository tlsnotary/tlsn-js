import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { prove, verify } from 'tlsn-js';
import { Proof } from 'tlsn-js/build/types';
import { Watch } from 'react-loader-spinner';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

const antsCookieStr =
  'atuserid=%7B%22name%22%3A%22atuserid%22%2C%22val%22%3A%22a22b2781-6d8d-4c6a-bae9-85d379b557f9%22%2C%22options%22%3A%7B%22end%22%3A%222025-05-25T23%3A08%3A33.110Z%22%2C%22path%22%3A%22%2F%22%7D%7D; atauthority=%7B%22name%22%3A%22atauthority%22%2C%22val%22%3A%7B%22authority_name%22%3A%22cnil%22%2C%22visitor_mode%22%3A%22exempt%22%7D%2C%22options%22%3A%7B%22end%22%3A%222025-05-25T23%3A08%3A33.111Z%22%2C%22path%22%3A%22%2F%22%7D%7D; eulerian=1; atuserid=%7B%22name%22%3A%22atuserid%22%2C%22val%22%3A%22OPT-OUT%22%2C%22options%22%3A%7B%22end%22%3A%222025-05-25T23%3A08%3A37.899Z%22%2C%22path%22%3A%22%2F%22%7D%7D; fctid=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2FwcC5mcmFuY2Vjb25uZWN0LmdvdXYuZnIiLCJzdWIiOiI2NjRkMTEyMjkwNTQxNWJlZmRhMzllMTZkMDE0ZmY5NGI2ZWVhZTc2YzQ1MDRiMDFjYWYwYjc5YjMyNzBlMjgydjEiLCJhdWQiOiIxYzJiMGQxMjY4ZDUwYTg2NTI5OTc5ZTBhN2EyYmI0NzRkMzNmMjA5ODNkMDk0NGY5OGJiMzEwOWI1YjM0NzliIiwiZXhwIjoxNzE0MTIyMjU0LCJpYXQiOjE3MTQxMjIxOTQsIm5vbmNlIjoiNXZ1OVI4cWJpbEpYNG9xaVJLYlUiLCJpZHAiOiJGQyIsImFjciI6ImVpZGFzMSIsImFtciI6bnVsbH0.Q20Y2LL7MfwI7tv-r1rx4ysxHY8QfgMsxhtS0k2HvVw; pdfcc=2; JSESSIONID=7F156C37219FB52FE5F19047F74B3810.node1; ants_token_prod=eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIxZHJ2dnlrQlR3NV9QaVBobm0xWE4yVHFpRUpTcHFPVWV0WlVoZlRLTm9NIn0.eyJleHAiOjE3MTQxMzE1MDAsImlhdCI6MTcxNDEyOTcwMCwianRpIjoiOTBkYzZhZTYtZGMxMC00YmE3LWJhMDMtYWZkNWViNGQ2MTUyIiwiaXNzIjoiaHR0cDovL3BvcnRhbC1zc28ucG9ydGFpbC5wcml2LmFudHMuZnI6ODA4MC9iYWNrZW5kL3Nzby9hdXRoL3JlYWxtcy9wdWJsaWMiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiYjc3ZTE5ZDMtOGU5Ny00MWQ2LTkzMGQtNzIyMDUyMGFlODVjIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYW50cy1zZXJ2aWNlIiwic2Vzc2lvbl9zdGF0ZSI6ImNhM2E4ODBlLWM5YWMtNDI2Yi05ZGRmLWM0OTM2OTZiYzMzMyIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJQVUJMSUMiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicHJvZmlsZSBlbWFpbCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiU2xpbWFuZSBBSVQgU0kgQUxJIiwicHJlZmVycmVkX3VzZXJuYW1lIjoic2FpdHNpYWxpNzE3IiwiZ2l2ZW5fbmFtZSI6IlNsaW1hbmUiLCJmYW1pbHlfbmFtZSI6IkFJVCBTSSBBTEkiLCJyZWFsbV9uYW1lIjoicHVibGljIiwiZW1haWwiOiJzbGltYW5lLmFzYUBvdXRsb29rLmNvbSIsInVzZXJuYW1lIjoic2FpdHNpYWxpNzE3In0.PWlYbY9I6r2izK56AH6UQg41Ri_gKIw7D1eGfU7lANwPcH78kl02PjQwkR1NIU4rFs-ywypuXNJOlmo6gFwFd1nyQV44NFtN1UcxqL1d1G9ZVMmTBd7fBuFqnDNsfQr0DXBuPfHEIdHeHAb4AYgymHS0xXRfPOaJtaXoJsmHB2J72_VnTq7CSBWm3dYgmEx8FkPnewox5knTOhnmnK7AIotuB1xh0kTtrxtZ9fdjnIfU2V0o4a1REBIbXfumjVzFAloPSR_SBBiB18f8_H6AUZHCnamnXNe8I4wb4UNCcn5j68nGI2sYTQSez7hQALP5M5l9vNeKCIJmG4zAsRO6KQ; ember_simple_auth-session=%7B%22authenticated%22%3A%7B%22authenticator%22%3A%22authenticator%3Ajwt%22%2C%22access_token%22%3A%22eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIxZHJ2dnlrQlR3NV9QaVBobm0xWE4yVHFpRUpTcHFPVWV0WlVoZlRLTm9NIn0.eyJleHAiOjE3MTQxMzE1MDAsImlhdCI6MTcxNDEyOTcwMCwianRpIjoiOTBkYzZhZTYtZGMxMC00YmE3LWJhMDMtYWZkNWViNGQ2MTUyIiwiaXNzIjoiaHR0cDovL3BvcnRhbC1zc28ucG9ydGFpbC5wcml2LmFudHMuZnI6ODA4MC9iYWNrZW5kL3Nzby9hdXRoL3JlYWxtcy9wdWJsaWMiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiYjc3ZTE5ZDMtOGU5Ny00MWQ2LTkzMGQtNzIyMDUyMGFlODVjIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYW50cy1zZXJ2aWNlIiwic2Vzc2lvbl9zdGF0ZSI6ImNhM2E4ODBlLWM5YWMtNDI2Yi05ZGRmLWM0OTM2OTZiYzMzMyIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJQVUJMSUMiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoicHJvZmlsZSBlbWFpbCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiU2xpbWFuZSBBSVQgU0kgQUxJIiwicHJlZmVycmVkX3VzZXJuYW1lIjoic2FpdHNpYWxpNzE3IiwiZ2l2ZW5fbmFtZSI6IlNsaW1hbmUiLCJmYW1pbHlfbmFtZSI6IkFJVCBTSSBBTEkiLCJyZWFsbV9uYW1lIjoicHVibGljIiwiZW1haWwiOiJzbGltYW5lLmFzYUBvdXRsb29rLmNvbSIsInVzZXJuYW1lIjoic2FpdHNpYWxpNzE3In0.PWlYbY9I6r2izK56AH6UQg41Ri_gKIw7D1eGfU7lANwPcH78kl02PjQwkR1NIU4rFs-ywypuXNJOlmo6gFwFd1nyQV44NFtN1UcxqL1d1G9ZVMmTBd7fBuFqnDNsfQr0DXBuPfHEIdHeHAb4AYgymHS0xXRfPOaJtaXoJsmHB2J72_VnTq7CSBWm3dYgmEx8FkPnewox5knTOhnmnK7AIotuB1xh0kTtrxtZ9fdjnIfU2V0o4a1REBIbXfumjVzFAloPSR_SBBiB18f8_H6AUZHCnamnXNe8I4wb4UNCcn5j68nGI2sYTQSez7hQALP5M5l9vNeKCIJmG4zAsRO6KQ%22%2C%22expires_in%22%3A1800%2C%22refresh_expires_in%22%3A28494%2C%22refresh_token%22%3A%22eyJhbGciOiJIUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICI4MmEzMjBiMC05NmQ1LTRlNzQtOTZlYS05N2Y2YTA1OWYzOGIifQ.eyJleHAiOjE3MTQxNTgxOTQsImlhdCI6MTcxNDEyOTcwMCwianRpIjoiMDdjYjliYTEtZjk5NS00NjJhLWEyMjAtOGVlZTJlYTIwMDdkIiwiaXNzIjoiaHR0cDovL3BvcnRhbC1zc28ucG9ydGFpbC5wcml2LmFudHMuZnI6ODA4MC9iYWNrZW5kL3Nzby9hdXRoL3JlYWxtcy9wdWJsaWMiLCJhdWQiOiJodHRwOi8vcG9ydGFsLXNzby5wb3J0YWlsLnByaXYuYW50cy5mcjo4MDgwL2JhY2tlbmQvc3NvL2F1dGgvcmVhbG1zL3B1YmxpYyIsInN1YiI6ImI3N2UxOWQzLThlOTctNDFkNi05MzBkLTcyMjA1MjBhZTg1YyIsInR5cCI6IlJlZnJlc2giLCJhenAiOiJhbnRzLXNlcnZpY2UiLCJzZXNzaW9uX3N0YXRlIjoiY2EzYTg4MGUtYzlhYy00MjZiLTlkZGYtYzQ5MzY5NmJjMzMzIiwic2NvcGUiOiJwcm9maWxlIGVtYWlsIn0.BZFkSrfD-za3BoeCWjyDOjGaXyXd7bn8dylwt3hzRqc%22%2C%22token_type%22%3A%22bearer%22%2C%22id_token%22%3Anull%2C%22not-before-policy%22%3A0%2C%22session_state%22%3A%22ca3a880e-c9ac-426b-9ddf-c493696bc333%22%2C%22scope%22%3A%22profile%20email%22%2C%22error%22%3Anull%2C%22error_description%22%3Anull%2C%22error_uri%22%3Anull%2C%22exp%22%3A1714131500%2C%22tokenData%22%3A%7B%22exp%22%3A1714131500%2C%22iat%22%3A1714129700%2C%22jti%22%3A%2290dc6ae6-dc10-4ba7-ba03-afd5eb4d6152%22%2C%22iss%22%3A%22http%3A%2F%2Fportal-sso.portail.priv.ants.fr%3A8080%2Fbackend%2Fsso%2Fauth%2Frealms%2Fpublic%22%2C%22aud%22%3A%22account%22%2C%22sub%22%3A%22b77e19d3-8e97-41d6-930d-7220520ae85c%22%2C%22typ%22%3A%22Bearer%22%2C%22azp%22%3A%22ants-service%22%2C%22session_state%22%3A%22ca3a880e-c9ac-426b-9ddf-c493696bc333%22%2C%22acr%22%3A%221%22%2C%22realm_access%22%3A%7B%22roles%22%3A%5B%22offline_access%22%2C%22PUBLIC%22%2C%22uma_authorization%22%5D%7D%2C%22resource_access%22%3A%7B%22account%22%3A%7B%22roles%22%3A%5B%22manage-account%22%2C%22manage-account-links%22%2C%22view-profile%22%5D%7D%7D%2C%22scope%22%3A%22profile%20email%22%2C%22email_verified%22%3Atrue%2C%22name%22%3A%22Slimane%20AIT%20SI%20ALI%22%2C%22preferred_username%22%3A%22saitsiali717%22%2C%22given_name%22%3A%22Slimane%22%2C%22family_name%22%3A%22AIT%20SI%20ALI%22%2C%22realm_name%22%3A%22public%22%2C%22email%22%3A%22slimane.asa%40outlook.com%22%2C%22username%22%3A%22saitsiali717%22%7D%7D%7D; atauthority=%7B%22name%22%3A%22atauthority%22%2C%22val%22%3A%7B%22authority_name%22%3A%22default%22%2C%22visitor_mode%22%3A%22optin%22%7D%2C%22options%22%3A%7B%22end%22%3A%222025-05-28T11%3A14%3A18.717Z%22%2C%22path%22%3A%22%2F%22%7D%7D';

function App(): ReactElement {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    time: number;
    sent: string;
    recv: string;
    notaryUrl: string;
  } | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);

  // swapi.dev /api/people/1
  // dummyjson.com /products/1
  // moncompte.ants.gouv.fr /backend/api/user/saitsiali717

  https: const domain = 'dummyjson.com';
  const path = '/products/1';

  const webUrl = 'https://' + domain + path;

  // const notaryUrl = 'https://notary.pse.dev/v0.1.0-alpha.5';
  // const websocketProxyUrl = 'wss://notary.pse.dev/proxy?token=' + domain;

  const notaryUrl = 'http://localhost:7047';
  const websocketProxyUrl = 'ws://localhost:55688';

  // const notaryUrl = 'https://notary.eternis.ai';
  // const websocketProxyUrl = 'wss://notary.eternis.ai:55688';

  const onClick = useCallback(async () => {
    setProcessing(true);
    const p = await prove(webUrl, {
      method: 'GET',
      maxTranscriptSize: 16384, //16384 to 20480,
      // maxRecvData: 16384,
      // maxSentData: 16384,
      notaryUrl,
      websocketProxyUrl,
      headers: {
        // Cookie: antsCookieStr.slice(0, 4000),
        'Content-Type': 'application/json',
      },
      secretHeaders: [],
      secretResps: [],
    });
    setProof(p);
  }, [setProof, setProcessing]);

  useEffect(() => {
    (async () => {
      if (proof) {
        const r = await verify(proof);
        setResult(r);
        setProcessing(false);
      }
    })();
  }, [proof, setResult]);

  return (
    <div>
      <button onClick={!processing ? onClick : undefined} disabled={processing}>
        Start demo
      </button>
      <div>
        <b>Proof: </b>
        {!processing && !proof ? (
          <i>not started</i>
        ) : !proof ? (
          <>
            Proving data from {domain}..
            <Watch
              visible={true}
              height="40"
              width="40"
              radius="48"
              color="#000000"
              ariaLabel="watch-loading"
              wrapperStyle={{}}
              wrapperClass=""
            />
            Open <i>Developer tools</i> to follow progress
          </>
        ) : (
          <>
            <details>
              <summary>View Proof</summary>
              <pre>{JSON.stringify(proof, null, 2)}</pre>
            </details>
          </>
        )}
      </div>
      <div>
        <b>Verification: </b>
        {!proof ? (
          <i>not started</i>
        ) : !result ? (
          <i>verifying</i>
        ) : (
          <pre>{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

function processCookie(cookieStr: string) {
  const cookies = antsCookieStr.split(';');

  let cookieStr_ = '';
  for (let i in cookies) {
    if (i !== '8') cookieStr_ += cookies[i];
  }

  return cookieStr_;
}
