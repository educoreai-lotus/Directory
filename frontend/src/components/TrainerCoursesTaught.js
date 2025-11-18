// Frontend Component - Trainer Courses Taught
// Displays courses taught by the trainer

import React, { useState, useEffect } from 'react';
import { getCoursesTaught } from '../services/trainerService';

function TrainerCoursesTaught({ employeeId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const coursesData = await getCoursesTaught(employeeId);
        setCourses(coursesData || []);
      } catch (err) {
        console.error('Error fetching courses taught:', err);
        setError(err.response?.data?.error || 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchCourses();
    }
  }, [employeeId]);

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="p-4 rounded-lg text-sm"
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--border-error)',
          color: 'var(--text-error)'
        }}
      >
        {error}
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div 
        className="p-6 rounded-lg text-center"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)'
        }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>
          No courses assigned yet. Courses will appear here once you're assigned to teach a course.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course, index) => (
        <div
          key={index}
          className="p-4 rounded-lg border"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)'
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {course.course_name || course.name || 'Course'}
              </h3>
              {course.description && (
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {course.description}
                </p>
              )}
              {course.status && (
                <span 
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    background: course.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                    color: course.status === 'active' ? 'rgb(34, 197, 94)' : 'rgb(156, 163, 175)'
                  }}
                >
                  {course.status}
                </span>
              )}
            </div>
            {course.course_id && (
              <a
                href={`https://coursebuilderfs-production.up.railway.app/courses/${course.course_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-600 hover:text-teal-700 ml-4"
              >
                View Course →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TrainerCoursesTaught;

