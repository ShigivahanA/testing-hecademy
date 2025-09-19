import React, { useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import CourseCard from './CourseCard';
import { Link } from 'react-router-dom';

const CoursesSection = () => {

  const { allCourses } = useContext(AppContext)

  return (
    <div className="py-16 md:px-40 px-8">
      <h2 className="text-3xl font-medium text-gray-800">Learn from the Best, Designed for You</h2>
      <p className="md:text-base text-sm text-gray-500 mt-3">
        Explore our curated courses across coding, design, business, wellness, and more. Each course is personalized to match your preferences, skill level, and pace — so you get the most out of your learning journey.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-4 md:px-0 md:my-16 my-10 gap-4">
        {allCourses.slice(0, 4).map((course, index) => <CourseCard key={index} course={course} />)}
      </div>
      <Link to={'/course-list'} onClick={() => scrollTo(0, 0)} className="text-gray-500 border-[0.5px] border-gray-400 hover:-translate-y-1 duration-500 hover:shadow-[4px_4px_0_#000] px-10 py-3 rounded-xl">Show all courses</Link>
    </div>
  );
};

export default CoursesSection;
