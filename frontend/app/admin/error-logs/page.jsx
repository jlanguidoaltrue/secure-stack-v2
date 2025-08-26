'use client';
import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Box, 
  Pagination,
  Alert,
  CircularProgress
} from '@mui/material';
import api from '../../../lib/api';

export default function ErrorLogsPage() {
  const [errorLogs, setErrorLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    level: '',
    resolved: '',
    search: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchErrorLogs();
    fetchStats();
  }, [filters]);

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(`/admin/error-logs?${params}`);
      setErrorLogs(response.data.data);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError('Failed to fetch error logs');
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/error-logs/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleResolveLog = async (logId, resolved = true) => {
    try {
      await api.patch(`/admin/error-logs/${logId}/resolve`, { resolved });
      fetchErrorLogs();
      fetchStats();
      setDialogOpen(false);
    } catch (err) {
      setError('Failed to update error log');
      console.error('Error updating log:', err);
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'info': return 'info';
      case 'debug': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value
    }));
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Error Logs Management
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant="h6">{stats.total}</Typography>
            <Typography variant="body2" color="text.secondary">Total Errors</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 150 }}>
            <Typography variant="h6" color="error">{stats.unresolved}</Typography>
            <Typography variant="body2" color="text.secondary">Unresolved</Typography>
          </Paper>
          {stats.byLevel.map(level => (
            <Paper key={level._id} sx={{ p: 2, minWidth: 120 }}>
              <Typography variant="h6">{level.count}</Typography>
              <Typography variant="body2" color="text.secondary">
                {level._id?.toUpperCase() || 'Unknown'}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Search"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Level</InputLabel>
            <Select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              label="Level"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="warn">Warning</MenuItem>
              <MenuItem value="info">Info</MenuItem>
              <MenuItem value="debug">Debug</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.resolved}
              onChange={(e) => handleFilterChange('resolved', e.target.value)}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="false">Unresolved</MenuItem>
              <MenuItem value="true">Resolved</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={fetchErrorLogs}>
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Error Logs Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : errorLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No error logs found
                </TableCell>
              </TableRow>
            ) : (
              errorLogs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell>{formatDate(log.createdAt)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={log.level?.toUpperCase()} 
                      color={getLevelColor(log.level)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" noWrap>
                      {log.message}
                    </Typography>
                  </TableCell>
                  <TableCell>{log.url}</TableCell>
                  <TableCell>
                    <Chip 
                      label={log.resolved ? 'Resolved' : 'Unresolved'} 
                      color={log.resolved ? 'success' : 'error'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedLog(log);
                        setDialogOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={(e, page) => handleFilterChange('page', page)}
            color="primary"
          />
        </Box>
      )}

      {/* Error Log Detail Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Error Log Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Date:</strong> {formatDate(selectedLog.createdAt)}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Level:</strong> <Chip label={selectedLog.level?.toUpperCase()} color={getLevelColor(selectedLog.level)} size="small" />
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Message:</strong> {selectedLog.message}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                <strong>URL:</strong> {selectedLog.url}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Method:</strong> {selectedLog.method}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                <strong>Status Code:</strong> {selectedLog.statusCode}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                <strong>IP:</strong> {selectedLog.ip}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                <strong>User Agent:</strong> {selectedLog.userAgent}
              </Typography>
              {selectedLog.stack && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    <strong>Stack Trace:</strong>
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100', maxHeight: 300, overflow: 'auto' }}>
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedLog.stack}
                    </Typography>
                  </Paper>
                </>
              )}
              {selectedLog.resolved && (
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                  <strong>Resolved by:</strong> {selectedLog.resolvedBy?.username || 'Unknown'} on {formatDate(selectedLog.resolvedAt)}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedLog && !selectedLog.resolved && (
            <Button
              onClick={() => handleResolveLog(selectedLog._id, true)}
              color="success"
              variant="contained"
            >
              Mark as Resolved
            </Button>
          )}
          {selectedLog && selectedLog.resolved && (
            <Button
              onClick={() => handleResolveLog(selectedLog._id, false)}
              color="warning"
              variant="outlined"
            >
              Mark as Unresolved
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
