const { readLogFile } = require('../utils/logFiles');

// @desc    Get null owners log
// @route   GET /api/admin/logs/null-owners
// @access  Private/Admin
exports.getNullOwnersLog = async (req, res) => {
  try {
    const logContent = readLogFile('null-owners.log');
    if (!logContent) {
      return res.status(200).json({
        success: true,
        data: 'No null owners have been logged yet.'
      });
    }

    // Parse log entries into structured data
    const logEntries = logContent.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const [timestamp, details] = line.split(' - ');
        const assetMatch = details.match(/Asset: ([^,]+)/);
        const ownerMatch = details.match(/Null Owner ID: ([^,]+)/);
        const shareMatch = details.match(/Share: ([^%]+)%/);
        
        return {
          timestamp,
          assetId: assetMatch ? assetMatch[1] : 'unknown',
          ownerId: ownerMatch ? ownerMatch[1] : 'unknown',
          sharePercentage: shareMatch ? parseFloat(shareMatch[1]) : 0
        };
      });
    
    res.status(200).json({
      success: true,
      count: logEntries.length,
      data: logEntries
    });
  } catch (err) {
    console.error('Error reading null owners log:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 
