The following APIs are the ones present in the backend:

http://localhost:5000/api/health - To check the functioning of the backend (GET)

http://localhost:5000/api/auth/register - Registration of a user (POST)

http://localhost:5000/api/auth/login - Login of a user (POST)

http://localhost:5000/api/auth/me - Getting the profile of a user (GET)

http://localhost:5000/api/auth/logout - Loggin out a user (POST)

http://localhost:5000/api/text/upload - Uploading a text file (POST)

http://localhost:5000/api/text/process - Text processing (POST)

http://localhost:5000/api/text/status/?id - Checking job status (GET)

http://localhost:5000/api/text/results/?id - Getting job results (GET)

http://localhost:5000/api/text/batch - Processing files in a batch (POST)

http://localhost:5000/api/dashboard/stats - Getting dashboard stats (GET)

http://localhost:5000/api/dashboard/recent - Getting recent jobs (GET)

http://localhost:5000/api/dashboard/quick-stats - Quick statistics (GET)

http://localhost:5000/api/history?page=1&limit=10&sort=newest - Getting history (GET)

http://localhost:5000/api/history/?id - Getting history by ID (GET)

http://localhost:5000/api/history/search?q=csv - Searching history (GET)

http://localhost:5000/api/history/export/?id - Exporting history (GET)

http://localhost:5000/api/history/?id - Deleting history (DELETE)
