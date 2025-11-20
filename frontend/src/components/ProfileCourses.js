// Component - Profile Courses Section
// Displays employee courses from Course Builder

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEmployeeCourses } from '../services/employeeService';

function ProfileCourses({ employeeId, user, employee }) {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coursesData, setCoursesData] = useState(null);
  const [taughtCourses, setTaughtCourses] = useState([]);
  
  // Determine if employee is a trainer - check employee prop first, then user prop
  const employeeData = employee || user;
  const isTrainer = employeeData?.is_trainer || (employeeData?.roles && Array.isArray(employeeData.roles) && employeeData.roles.includes('TRAINER'));

  useEffect(() => {
    const fetchCourses = async () => {
      const currentUser = user || authUser;
      if (!currentUser?.companyId || !employeeId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getEmployeeCourses(currentUser.companyId, employeeId);
        const courses = response?.courses || response?.response?.courses || response;
        setCoursesData(courses);
        
        // Fetch taught courses if user is a trainer
        if (isTrainer) {
          try {
            const { getCoursesTaught } = await import('../services/trainerService');
            const taught = await getCoursesTaught(employeeId);
            setTaughtCourses(taught || []);
          } catch (err) {
            console.warn('[ProfileCourses] Error fetching taught courses:', err);
            setTaughtCourses([]);
          }
        }
      } catch (err) {
        console.error('[ProfileCourses] Error fetching courses:', err);
        if (err.response?.status === 403) {
          setError('Your profile must be approved by HR to view courses.');
        } else {
          setError('Failed to load courses. Using fallback data.');
          setCoursesData({
            assigned_courses: [],
            in_progress_courses: [],
            completed_courses: []
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [employeeId, user?.companyId, authUser?.companyId, isTrainer]);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Courses
        </h2>
        <div className="p-6 rounded-lg border" style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading courses...
          </p>
        </div>
      </div>
    );
  }

  if (error && !coursesData) {
    return (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Courses
        </h2>
        <div className="p-6 rounded-lg border" style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)'
        }}>
          <p className="text-sm" style={{ color: 'var(--text-error, #ef4444)' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  const assigned = coursesData?.assigned_courses || [];
  const inProgress = coursesData?.in_progress_courses || [];
  const completed = coursesData?.completed_courses || [];

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Courses
      </h2>
      <div className="p-6 rounded-lg border" style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-default)'
      }}>
        <div className="space-y-4">
          {/* Taught Courses - Only for trainers */}
          {isTrainer && (
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Taught ({taughtCourses.length})
              </h3>
              {taughtCourses.length > 0 ? (
                <div className="space-y-2">
                  {taughtCourses.map((course, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        background: 'var(--bg-primary)',
                        borderColor: 'var(--border-default)'
                      }}
                      onClick={() => {
                        alert('Redirecting to COURSE BUILDER');
                      }}
                    >
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {course.course_name || course.name || `Course ${idx + 1}`}
                      </div>
                      {course.course_id && (
                        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                          ID: {course.course_id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No taught courses yet.
                </p>
              )}
            </div>
          )}
          
          {/* Assigned Courses */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Assigned Courses ({assigned.length})
            </h3>
            {assigned.length > 0 ? (
              <div className="space-y-2">
                {assigned.map((course, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-default)'
                    }}
                    onClick={() => {
                      alert('Redirecting to COURSE BUILDER');
                      // TODO: When Course Builder frontend is available, redirect to it
                      // const courseBuilderUrl = process.env.REACT_APP_COURSE_BUILDER_URL || 'https://coursebuilderfs-production.up.railway.app';
                      // window.open(`${courseBuilderUrl}/course/${course.course_id}`, '_blank');
                    }}
                  >
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {course.course_name || course.name || `Course ${idx + 1}`}
                    </div>
                    {course.course_id && (
                      <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        ID: {course.course_id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No courses assigned yet.
              </p>
            )}
          </div>

          {/* In Progress */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              In Progress ({inProgress.length})
            </h3>
            {inProgress.length > 0 ? (
              <div className="space-y-2">
                {inProgress.map((course, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-default)'
                    }}
                    onClick={() => {
                      alert('Redirecting to COURSE BUILDER');
                      // TODO: When Course Builder frontend is available, redirect to it
                      // const courseBuilderUrl = process.env.REACT_APP_COURSE_BUILDER_URL || 'https://coursebuilderfs-production.up.railway.app';
                      // window.open(`${courseBuilderUrl}/course/${course.course_id}`, '_blank');
                    }}
                  >
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {course.course_name || course.name || `Course ${idx + 1}`}
                    </div>
                    {course.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Progress
                          </span>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            {course.progress}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${course.progress}%`,
                              background: 'var(--color-primary, #3b82f6)'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No courses in progress.
              </p>
            )}
          </div>

          {/* Completed */}
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Completed ({completed.length})
            </h3>
            {completed.length > 0 ? (
              <div className="space-y-2">
                {completed.map((course, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded border cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      background: 'var(--bg-primary)',
                      borderColor: 'var(--border-default)'
                    }}
                    onClick={() => {
                      alert('Redirecting to COURSE BUILDER');
                      // TODO: When Course Builder frontend is available, redirect to it
                      // const courseBuilderUrl = process.env.REACT_APP_COURSE_BUILDER_URL || 'https://coursebuilderfs-production.up.railway.app';
                      // window.open(`${courseBuilderUrl}/course/${course.course_id}`, '_blank');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {course.course_name || course.name || `Course ${idx + 1}`}
                        </div>
                        {course.completed_at && (
                          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            Completed: {new Date(course.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 rounded" style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: 'rgb(34, 197, 94)'
                      }}>
                        ✓ Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No completed courses yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileCourses;

