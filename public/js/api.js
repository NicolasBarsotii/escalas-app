const API_URL = '/api';

const api = {
    getColumns: async () => {
        const res = await fetch(`${API_URL}/columns`);
        return res.json();
    },
    createColumn: async (title) => {
        const res = await fetch(`${API_URL}/columns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        return res.json();
    },
    deleteColumn: async (columnId) => {
        const res = await fetch(`${API_URL}/columns/${columnId}`, {
            method: 'DELETE'
        });
        return res.json();
    },
    createEvent: async (columnId, eventData) => {
        const res = await fetch(`${API_URL}/columns/${columnId}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        return res.json();
    },
    updateEvent: async (columnId, eventId, eventData) => {
        const res = await fetch(`${API_URL}/columns/${columnId}/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
        });
        return res.json();
    },
    deleteEvent: async (columnId, eventId) => {
        const res = await fetch(`${API_URL}/columns/${columnId}/events/${eventId}`, {
            method: 'DELETE'
        });
        return res.json();
    }
};